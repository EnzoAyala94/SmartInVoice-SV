// src/services/pdfService.js
const PDFDocument = require('pdfkit');
const { emisor } = require('../config/emisor');
const { NOMBRES_TIPO_DTE } = require('./correlativoService');

const COLOR_ENCABEZADO = '#dce6f1';
const COLOR_BORDE = '#9aa5b8';
const COLOR_TEXTO = '#10192b';

/**
 * Dibuja una tabla simple (una fila de encabezados + una fila de valores)
 * con bordes, ajustando la altura de la fila al contenido mas largo.
 * Devuelve la posicion Y donde termino de dibujar.
 */
function dibujarTablaFila(doc, { x, y, columnas, valores, fontSizeEncabezado = 7, fontSizeValor = 7.5 }) {
  const padding = 4;

  // Altura de la fila de encabezados
  doc.fontSize(fontSizeEncabezado);
  let alturaEncabezado = 0;
  columnas.forEach((col) => {
    const h = doc.heightOfString(col.header, { width: col.width - padding * 2 });
    alturaEncabezado = Math.max(alturaEncabezado, h);
  });
  alturaEncabezado += padding * 2;

  // Altura de la fila de valores
  doc.fontSize(fontSizeValor);
  let alturaValor = 0;
  columnas.forEach((col, i) => {
    const texto = String(valores[i] ?? '—');
    const h = doc.heightOfString(texto, { width: col.width - padding * 2 });
    alturaValor = Math.max(alturaValor, h);
  });
  alturaValor += padding * 2;

  // Dibujar encabezados
  let cursorX = x;
  columnas.forEach((col) => {
    doc.rect(cursorX, y, col.width, alturaEncabezado).fillAndStroke(COLOR_ENCABEZADO, COLOR_BORDE);
    doc.fillColor(COLOR_TEXTO).fontSize(fontSizeEncabezado).font('Helvetica-Bold')
      .text(col.header, cursorX + padding, y + padding, { width: col.width - padding * 2 });
    cursorX += col.width;
  });

  const yValores = y + alturaEncabezado;

  // Dibujar valores
  cursorX = x;
  columnas.forEach((col, i) => {
    doc.rect(cursorX, yValores, col.width, alturaValor).stroke(COLOR_BORDE);
    doc.fillColor(COLOR_TEXTO).fontSize(fontSizeValor).font('Helvetica')
      .text(String(valores[i] ?? '—'), cursorX + padding, yValores + padding, { width: col.width - padding * 2 });
    cursorX += col.width;
  });

  return yValores + alturaValor;
}

/**
 * Genera la Representacion Grafica (PDF) de un DTE, con la informacion
 * principal organizada en tablas (filas y columnas), igual que en el
 * reporte Excel, para que ambos formatos luzcan consistentes.
 */
function generarPDFDte(res, { dte, items }) {
  const documento = JSON.parse(dte.json_documento);
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=DTE-${dte.numero_control}.pdf`);
  doc.pipe(res);

  const nombreTipoDte = NOMBRES_TIPO_DTE[dte.tipo_dte] || dte.tipo_dte;
  const noSujeto = documento.resumen?.totalNoSuj || 0;
  const receptor = documento.receptor || {};
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Encabezado de la empresa (emisor)
  doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(15).text(emisor.nombreComercial || emisor.nombre);
  doc.font('Helvetica').fontSize(9).text(`NIT: ${emisor.nit}   NRC: ${emisor.nrc}   ${emisor.descActividad || ''}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(13).text('DOCUMENTO TRIBUTARIO ELECTRONICO', { align: 'center' });
  doc.moveDown(0.6);

  let y = doc.y;
  const x = doc.page.margins.left;

  // Tabla 1: identificacion del documento
  const columnasIdentificacion = [
    { header: 'Tipo DTE', width: 70 },
    { header: 'Numero de Control', width: 150 },
    { header: 'Codigo de Generacion', width: 170 },
    { header: 'Fecha Emision', width: 60 },
    { header: 'Estado', width: 60 },
    { header: 'Sello de Recepcion', width: anchoUtil - (70 + 150 + 170 + 60 + 60) },
  ];
  const valoresIdentificacion = [
    `${nombreTipoDte} (${dte.tipo_dte})`,
    dte.numero_control,
    dte.codigo_generacion,
    dte.fecha_emision,
    dte.estado,
    dte.sello_recepcion || 'PENDIENTE',
  ];
  y = dibujarTablaFila(doc, { x, y, columnas: columnasIdentificacion, valores: valoresIdentificacion });
  y += 12;

  // Tabla 2: receptor y totales
  const columnasTotales = [
    { header: 'NIT Receptor', width: 100 },
    { header: 'Nombre Receptor', width: 220 },
    { header: 'Gravado', width: 90 },
    { header: 'Exento', width: 90 },
    { header: 'No Sujeto', width: 90 },
    { header: 'IVA', width: 90 },
    { header: 'Total', width: anchoUtil - (100 + 220 + 90 + 90 + 90 + 90) },
  ];
  const valoresTotales = [
    receptor.numDocumento || '—',
    receptor.nombre || 'Consumidor Final',
    `$${dte.monto_gravado.toFixed(2)}`,
    `$${dte.monto_exento.toFixed(2)}`,
    `$${noSujeto.toFixed(2)}`,
    `$${dte.monto_iva.toFixed(2)}`,
    `$${dte.monto_total.toFixed(2)}`,
  ];
  y = dibujarTablaFila(doc, { x, y, columnas: columnasTotales, valores: valoresTotales });
  y += 20;

  // Tabla 3: detalle de items
  doc.font('Helvetica-Bold').fontSize(11).text('Detalle de items:', x, y);
  y += 18;

  const columnasItems = [
    { header: 'Cant.', width: 50 },
    { header: 'Descripcion', width: anchoUtil - (50 + 90 + 90 + 90) },
    { header: 'Precio Unitario', width: 90 },
    { header: 'Gravado', width: 90 },
    { header: 'Exento', width: 90 },
  ];

  // Encabezado de la tabla de items
  let cursorX = x;
  doc.fontSize(8);
  columnasItems.forEach((col) => {
    doc.rect(cursorX, y, col.width, 20).fillAndStroke(COLOR_ENCABEZADO, COLOR_BORDE);
    doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').text(col.header, cursorX + 4, y + 5, { width: col.width - 8 });
    cursorX += col.width;
  });
  y += 20;

  items.forEach((item) => {
    const valoresFila = [
      String(item.cantidad),
      item.descripcion,
      `$${item.precio_unitario.toFixed(2)}`,
      `$${item.ventas_gravadas.toFixed(2)}`,
      `$${item.ventas_exentas.toFixed(2)}`,
    ];
    let alturaFila = 0;
    columnasItems.forEach((col, i) => {
      const h = doc.fontSize(8).heightOfString(valoresFila[i], { width: col.width - 8 });
      alturaFila = Math.max(alturaFila, h);
    });
    alturaFila += 8;

    cursorX = x;
    columnasItems.forEach((col, i) => {
      doc.rect(cursorX, y, col.width, alturaFila).stroke(COLOR_BORDE);
      doc.fillColor(COLOR_TEXTO).font('Helvetica').fontSize(8)
        .text(valoresFila[i], cursorX + 4, y + 4, { width: col.width - 8 });
      cursorX += col.width;
    });
    y += alturaFila;
  });

  y += 20;
  doc.font('Helvetica').fontSize(8).fillColor('gray').text(
    'Documento generado electronicamente. Este es un comprobante de sistema, valido segun normativa vigente del Ministerio de Hacienda de El Salvador.',
    x, y, { width: anchoUtil, align: 'center' }
  );

  // Marca de agua diagonal cuando el documento esta anulado, para que
  // nunca se confunda con una factura valida al imprimirla o compartirla.
  if (dte.estado === 'ANULADO') {
    doc.save();
    doc.opacity(0.18);
    doc.fillColor('red');
    doc.fontSize(100);
    doc.font('Helvetica-Bold');
    doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text('ANULADA', 0, doc.page.height / 2 - 60, {
      width: doc.page.width,
      align: 'center',
    });
    doc.restore();
  }

  doc.end();
}

module.exports = { generarPDFDte };
