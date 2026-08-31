// src/services/reporteService.js
const ExcelJS = require('exceljs');
const db = require('../config/db');
const { NOMBRES_TIPO_DTE } = require('./correlativoService');

const NOMBRES_FORMA_PAGO = {
  '01': 'Billete/Moneda (Efectivo)',
  '02': 'Tarjeta Debito',
  '03': 'Tarjeta Credito',
  '04': 'Cheque',
  '05': 'Transferencia - Deposito Bancario',
  '08': 'Tarjeta de Regalo',
  '09': 'Vales o Cupones',
  '11': 'Notas de Credito',
  '99': 'Otros (no especificado)',
};

const NOMBRES_AMBIENTE = { '00': 'Pruebas', '01': 'Produccion' };
const NOMBRES_CONDICION_OPERACION = { 1: 'Contado', 2: 'Credito', 3: 'Otro' };

async function generarReporteVentas(res, { desde, hasta }) {
  let query = `
    SELECT d.numero_control, d.codigo_generacion, d.tipo_dte, d.fecha_emision,
           d.estado, d.monto_gravado, d.monto_exento, d.monto_iva, d.monto_total,
           COALESCE(c.nombre, 'Consumidor Final') as cliente,
           COALESCE(c.numero_documento, '') as documento_cliente
    FROM dtes d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (desde) { query += ' AND d.fecha_emision >= ?'; params.push(desde); }
  if (hasta) { query += ' AND d.fecha_emision <= ?'; params.push(hasta); }
  query += ' ORDER BY d.fecha_emision, d.numero_control';

  const filas = db.prepare(query).all(...params);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Libro de Ventas');

  sheet.columns = [
    { header: 'Fecha', key: 'fecha_emision', width: 14 },
    { header: 'Tipo DTE', key: 'tipo_dte', width: 10 },
    { header: 'Numero de Control', key: 'numero_control', width: 35 },
    { header: 'Codigo Generacion', key: 'codigo_generacion', width: 38 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Documento', key: 'documento_cliente', width: 18 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Gravado', key: 'monto_gravado', width: 12 },
    { header: 'Exento', key: 'monto_exento', width: 12 },
    { header: 'IVA', key: 'monto_iva', width: 12 },
    { header: 'Total', key: 'monto_total', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  filas.forEach((f) => sheet.addRow(f));

  // Totales al final
  const totalRow = sheet.addRow({
    fecha_emision: '',
    cliente: 'TOTALES',
    monto_gravado: filas.reduce((a, f) => a + f.monto_gravado, 0),
    monto_exento: filas.reduce((a, f) => a + f.monto_exento, 0),
    monto_iva: filas.reduce((a, f) => a + f.monto_iva, 0),
    monto_total: filas.reduce((a, f) => a + f.monto_total, 0),
  });
  totalRow.font = { bold: true };

  ['monto_gravado', 'monto_exento', 'monto_iva', 'monto_total'].forEach((key) => {
    sheet.getColumn(key).numFmt = '$#,##0.00';
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=reporte-ventas.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  generarReporteVentas, generarReporteVentasCliente, generarExcelFacturaIndividual,
  generarResumenIVA, generarExcelResumenIVA,
};

/**
 * Genera el resumen de IVA de un mes especifico, para preparar la
 * declaracion mensual (formulario F-07). Neteando automaticamente:
 * las Notas de Credito (05) RESTAN del total de ventas, las Notas de
 * Debito (06) SUMAN, tal como corresponde fiscalmente.
 * Solo se cuentan documentos PROCESADOS (no anulados ni rechazados).
 */
function generarResumenIVA({ mes }) {
  const filas = db.prepare(`
    SELECT * FROM dtes WHERE estado = 'PROCESADO' AND strftime('%Y-%m', fecha_emision) = ?
  `).all(mes);

  let ventasGravadas = 0, ventasExentas = 0, ventasNoSujetas = 0, debitoFiscal = 0, totalOperaciones = 0;
  const documentosPorTipo = {};

  filas.forEach((d) => {
    const signo = d.tipo_dte === '05' ? -1 : 1; // Nota de Credito resta, todo lo demas suma
    let noSujeto = 0;
    try {
      const documento = JSON.parse(d.json_documento);
      noSujeto = documento.resumen?.totalNoSuj || 0;
    } catch (e) { /* noop */ }

    ventasGravadas += signo * d.monto_gravado;
    ventasExentas += signo * d.monto_exento;
    ventasNoSujetas += signo * noSujeto;
    debitoFiscal += signo * d.monto_iva;
    totalOperaciones += signo * d.monto_total;

    const nombreTipo = NOMBRES_TIPO_DTE[d.tipo_dte] || d.tipo_dte;
    documentosPorTipo[nombreTipo] = (documentosPorTipo[nombreTipo] || 0) + 1;
  });

  return {
    mes,
    ventasGravadas: Number(ventasGravadas.toFixed(2)),
    ventasExentas: Number(ventasExentas.toFixed(2)),
    ventasNoSujetas: Number(ventasNoSujetas.toFixed(2)),
    debitoFiscal: Number(debitoFiscal.toFixed(2)),
    totalOperaciones: Number(totalOperaciones.toFixed(2)),
    cantidadDocumentos: filas.length,
    documentosPorTipo,
  };
}

async function generarExcelResumenIVA(res, resumen) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Resumen IVA');

  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = `Resumen de IVA - ${resumen.mes}`;
  sheet.getCell('A1').font = { bold: true, size: 14 };

  const filas = [
    ['Ventas Gravadas', resumen.ventasGravadas],
    ['Ventas Exentas', resumen.ventasExentas],
    ['Ventas No Sujetas', resumen.ventasNoSujetas],
    ['Debito Fiscal (IVA 13%)', resumen.debitoFiscal],
    ['Total de Operaciones', resumen.totalOperaciones],
    ['Cantidad de Documentos', resumen.cantidadDocumentos],
  ];

  let fila = 3;
  filas.forEach(([etiqueta, valor]) => {
    sheet.getCell(`A${fila}`).value = etiqueta;
    sheet.getCell(`A${fila}`).font = { bold: true };
    sheet.getCell(`B${fila}`).value = valor;
    fila += 1;
  });

  fila += 1;
  sheet.getCell(`A${fila}`).value = 'Documentos por tipo';
  sheet.getCell(`A${fila}`).font = { bold: true, size: 12 };
  fila += 1;
  Object.entries(resumen.documentosPorTipo).forEach(([tipo, cantidad]) => {
    sheet.getCell(`A${fila}`).value = tipo;
    sheet.getCell(`B${fila}`).value = cantidad;
    fila += 1;
  });

  sheet.columns = [{ key: 'a', width: 28 }, { key: 'b', width: 18 }];
  ['B3', 'B4', 'B5', 'B6', 'B7'].forEach((celda) => {
    sheet.getCell(celda).numFmt = '$#,##0.00';
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=resumen-iva-${resumen.mes}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Genera un Excel de UNA sola factura en formato de tabla (una fila con las
 * columnas fiscales principales), seguido del detalle de items debajo.
 */
async function generarExcelFacturaIndividual(res, { dte, items, clienteNombre }) {
  const documento = JSON.parse(dte.json_documento);
  const receptor = documento.receptor || {};

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Factura');

  sheet.columns = [
    { header: 'Tipo DTE', key: 'tipoDte', width: 12 },
    { header: 'Numero de Control', key: 'numeroControl', width: 34 },
    { header: 'Codigo de Generacion', key: 'codigoGeneracion', width: 38 },
    { header: 'Fecha Emision', key: 'fechaEmision', width: 14 },
    { header: 'NIT Receptor', key: 'nitReceptor', width: 16 },
    { header: 'Nombre Receptor', key: 'nombreReceptor', width: 30 },
    { header: 'Gravado', key: 'gravado', width: 12 },
    { header: 'Exento', key: 'exento', width: 12 },
    { header: 'No Sujeto', key: 'noSujeto', width: 12 },
    { header: 'IVA', key: 'iva', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Sello de Recepcion', key: 'sello', width: 40 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  sheet.addRow({
    tipoDte: `${NOMBRES_TIPO_DTE[dte.tipo_dte] || dte.tipo_dte} (${dte.tipo_dte})`,
    numeroControl: dte.numero_control,
    codigoGeneracion: dte.codigo_generacion,
    fechaEmision: dte.fecha_emision,
    nitReceptor: receptor.numDocumento || '—',
    nombreReceptor: receptor.nombre || clienteNombre || 'Consumidor Final',
    gravado: dte.monto_gravado,
    exento: dte.monto_exento,
    noSujeto: documento.resumen?.totalNoSuj || 0,
    iva: dte.monto_iva,
    total: dte.monto_total,
    estado: dte.estado,
    sello: dte.sello_recepcion || 'PENDIENTE',
  });

  ['gravado', 'exento', 'noSujeto', 'iva', 'total'].forEach((key) => {
    sheet.getColumn(key).numFmt = '$#,##0.00';
  });

  // Detalle de items, debajo de la fila principal
  let fila = 4;
  sheet.getCell(`A${fila}`).value = 'Detalle de items';
  sheet.getCell(`A${fila}`).font = { bold: true, size: 12, color: { argb: 'FF17335C' } };
  fila += 1;

  const filaEncabezado = fila;
  sheet.getRow(filaEncabezado).values = ['Cantidad', 'Descripcion', 'Precio Unitario', 'Gravado', 'Exento'];
  sheet.getRow(filaEncabezado).font = { bold: true };
  sheet.getRow(filaEncabezado).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  fila += 1;

  items.forEach((item) => {
    sheet.getRow(fila).values = [
      item.cantidad, item.descripcion, item.precio_unitario, item.ventas_gravadas, item.ventas_exentas,
    ];
    fila += 1;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=factura-${dte.numero_control}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Genera el Excel de facturas de UN cliente para un mes especifico (o todas si no se indica).
 * Usado por el Portal del Cliente para que descargue su propio historial.
 */
async function generarReporteVentasCliente(res, { clienteId, mes }) {
  let query = `
    SELECT numero_control, codigo_generacion, tipo_dte, fecha_emision, estado,
           monto_gravado, monto_exento, monto_iva, monto_total
    FROM dtes
    WHERE cliente_id = ?
  `;
  const params = [clienteId];

  if (mes) {
    query += ` AND strftime('%Y-%m', fecha_emision) = ?`;
    params.push(mes);
  }
  query += ' ORDER BY fecha_emision';

  const filas = db.prepare(query).all(...params);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(mes ? `Facturas ${mes}` : 'Facturas');

  sheet.columns = [
    { header: 'Fecha', key: 'fecha_emision', width: 14 },
    { header: 'Tipo DTE', key: 'tipo_dte', width: 10 },
    { header: 'Numero de Control', key: 'numero_control', width: 35 },
    { header: 'Codigo Generacion', key: 'codigo_generacion', width: 38 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Gravado', key: 'monto_gravado', width: 12 },
    { header: 'Exento', key: 'monto_exento', width: 12 },
    { header: 'IVA', key: 'monto_iva', width: 12 },
    { header: 'Total', key: 'monto_total', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  filas.forEach((f) => sheet.addRow(f));

  const totalRow = sheet.addRow({
    fecha_emision: '',
    tipo_dte: 'TOTAL',
    monto_gravado: filas.reduce((a, f) => a + f.monto_gravado, 0),
    monto_exento: filas.reduce((a, f) => a + f.monto_exento, 0),
    monto_iva: filas.reduce((a, f) => a + f.monto_iva, 0),
    monto_total: filas.reduce((a, f) => a + f.monto_total, 0),
  });
  totalRow.font = { bold: true };

  ['monto_gravado', 'monto_exento', 'monto_iva', 'monto_total'].forEach((key) => {
    sheet.getColumn(key).numFmt = '$#,##0.00';
  });

  const nombreArchivo = mes ? `facturas-${mes}.xlsx` : 'facturas-historico.xlsx';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
  await workbook.xlsx.write(res);
  res.end();
}
