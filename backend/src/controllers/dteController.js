// src/controllers/dteController.js
const db = require('../config/db');
const { construirDocumentoDTE } = require('../services/dteService');
const { firmarDocumento } = require('../services/firmaService');
const { transmitirDTE } = require('../services/mhService');
const { mh } = require('../config/emisor');

function registrarEvento(dteId, evento, detalle) {
  db.prepare(`
    INSERT INTO dte_eventos (dte_id, evento, detalle) VALUES (?, ?, ?)
  `).run(dteId, evento, detalle || null);
}

async function emitirDTE(req, res) {
  const { tipoDte, clienteId, items, condicionOperacion, documentoRelacionadoId, motivo } = req.body;

  if (!tipoDte || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tipoDte e items son requeridos.' });
  }

  const esNotaCreditoODebito = tipoDte === '05' || tipoDte === '06';

  let cliente = null;
  if (clienteId) {
    cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
  }

  // Las Notas de Credito/Debito siempre deben referenciar un DTE anterior
  let documentoRelacionado = null;
  let dteOriginal = null;
  if (esNotaCreditoODebito) {
    if (!documentoRelacionadoId) {
      return res.status(400).json({ error: 'Una Nota de Credito/Debito requiere seleccionar el documento que corrige.' });
    }
    dteOriginal = db.prepare('SELECT * FROM dtes WHERE id = ?').get(documentoRelacionadoId);
    if (!dteOriginal) {
      return res.status(404).json({ error: 'El documento relacionado no existe.' });
    }
    if (dteOriginal.estado === 'ANULADO') {
      return res.status(400).json({ error: 'No se puede emitir una Nota sobre un documento ya anulado.' });
    }
    if (clienteId && dteOriginal.cliente_id && Number(clienteId) !== dteOriginal.cliente_id) {
      return res.status(400).json({ error: 'El documento relacionado pertenece a otro cliente.' });
    }
    documentoRelacionado = {
      tipoDocumento: dteOriginal.tipo_dte,
      codigoGeneracion: dteOriginal.codigo_generacion,
      fechaEmision: dteOriginal.fecha_emision,
    };
  }

  try {
    // 1. Construir el JSON del documento
    const { documento, codigoGeneracion, numeroControl } = construirDocumentoDTE({
      tipoDte,
      cliente,
      items,
      condicionOperacion,
      documentoRelacionado,
      motivo,
    });

    // 2. Firmar el documento (simulado o real segun configuracion)
    const documentoFirmado = await firmarDocumento(documento, mh.modo);

    // 3. Guardar en base de datos como PENDIENTE antes de transmitir
    const resumen = documento.resumen;
    const insertDte = db.prepare(`
      INSERT INTO dtes (
        codigo_generacion, numero_control, tipo_dte, ambiente, cliente_id, usuario_id,
        fecha_emision, hora_emision, monto_total, monto_iva, monto_gravado, monto_exento,
        condicion_operacion, estado, json_documento,
        documento_relacionado_id, documento_relacionado_codigo, documento_relacionado_tipo,
        documento_relacionado_fecha, motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertDte.run(
      codigoGeneracion,
      numeroControl,
      tipoDte,
      documento.identificacion.ambiente,
      clienteId || null,
      req.usuario.id,
      documento.identificacion.fecEmi,
      documento.identificacion.horEmi,
      resumen.montoTotalOperacion,
      resumen.totalIva,
      resumen.totalGravada,
      resumen.totalExenta,
      condicionOperacion || 1,
      'PENDIENTE',
      JSON.stringify(documento),
      dteOriginal?.id || null,
      dteOriginal?.codigo_generacion || null,
      dteOriginal?.tipo_dte || null,
      dteOriginal?.fecha_emision || null,
      motivo || null
    );

    const dteId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO dte_items (
        dte_id, producto_id, numero_item, descripcion, cantidad, precio_unitario,
        monto_descuento, ventas_gravadas, ventas_exentas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    documento.cuerpoDocumento.forEach((item, idx) => {
      insertItem.run(
        dteId,
        items[idx].productoId || null,
        item.numItem,
        item.descripcion,
        item.cantidad,
        item.precioUni,
        item.montoDescu,
        item.ventaGravada,
        item.ventaExenta
      );
    });

    registrarEvento(dteId, 'GENERADO', `Numero de control: ${numeroControl}`);
    registrarEvento(dteId, 'FIRMADO', 'Documento firmado correctamente.');

    // 4. Transmitir al Ministerio de Hacienda
    const resultadoMH = await transmitirDTE({ documento, documentoFirmado, codigoGeneracion });

    const nuevoEstado = resultadoMH.estado;
    db.prepare(`
      UPDATE dtes SET estado = ?, sello_recepcion = ?, respuesta_mh = ? WHERE id = ?
    `).run(nuevoEstado, resultadoMH.selloRecepcion, JSON.stringify(resultadoMH.respuestaCruda), dteId);

    registrarEvento(
      dteId,
      resultadoMH.exito ? 'ACEPTADO' : 'RECHAZADO',
      resultadoMH.respuestaCruda?.descripcionMsg || 'Sin detalle'
    );

    const dteFinal = db.prepare('SELECT * FROM dtes WHERE id = ?').get(dteId);

    return res.status(201).json({
      mensaje: resultadoMH.exito
        ? 'DTE emitido y procesado correctamente.'
        : 'DTE generado pero rechazado/en contingencia por el MH.',
      dte: dteFinal,
      respuestaMH: resultadoMH.respuestaCruda,
    });
  } catch (error) {
    console.error('Error emitiendo DTE:', error);
    return res.status(500).json({ error: 'Error interno al emitir el DTE.', detalle: error.message });
  }
}

function listarDTEs(req, res) {
  const { estado, desde, hasta, tipoDte, clienteId, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT d.*, c.nombre as cliente_nombre
    FROM dtes d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (estado) {
    const estados = estado.split(',').map((e) => e.trim()).filter(Boolean);
    query += ` AND d.estado IN (${estados.map(() => '?').join(',')})`;
    params.push(...estados);
  }
  if (tipoDte) {
    query += ' AND d.tipo_dte = ?';
    params.push(tipoDte);
  }
  if (clienteId) {
    query += ' AND d.cliente_id = ?';
    params.push(clienteId);
  }
  if (desde) {
    query += ' AND d.fecha_emision >= ?';
    params.push(desde);
  }
  if (hasta) {
    query += ' AND d.fecha_emision <= ?';
    params.push(hasta);
  }

  query += ' ORDER BY d.creado_en DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const dtes = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as total FROM dtes').get().total;

  res.json({ dtes, total, page: Number(page), limit: Number(limit) });
}

function obtenerDTE(req, res) {
  const { id } = req.params;
  const dte = db.prepare(`
    SELECT d.*, c.nombre as cliente_nombre
    FROM dtes d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    WHERE d.id = ?
  `).get(id);

  if (!dte) return res.status(404).json({ error: 'DTE no encontrado.' });

  const items = db.prepare('SELECT * FROM dte_items WHERE dte_id = ?').all(id);
  const eventos = db.prepare('SELECT * FROM dte_eventos WHERE dte_id = ? ORDER BY creado_en').all(id);

  res.json({ dte, items, eventos });
}

function anularDTE(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;

  const dte = db.prepare('SELECT * FROM dtes WHERE id = ?').get(id);
  if (!dte) return res.status(404).json({ error: 'DTE no encontrado.' });
  if (dte.estado === 'ANULADO') {
    return res.status(400).json({ error: 'El DTE ya se encuentra anulado.' });
  }

  db.prepare('UPDATE dtes SET estado = ?, observaciones = ? WHERE id = ?')
    .run('ANULADO', motivo || 'Anulado por el usuario', id);

  registrarEvento(id, 'ANULADO', motivo || 'Sin motivo especificado');

  res.json({ mensaje: 'DTE anulado correctamente.' });
}

module.exports = { emitirDTE, listarDTEs, obtenerDTE, anularDTE };
