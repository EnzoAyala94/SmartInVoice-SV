const express = require('express');
const router = express.Router();
const { verificarTokenCliente } = require('../middleware/auth');
const db = require('../config/db');
const {
  perfil, listarMisFacturas, resumenMensual, mesesDisponibles,
  actualizarPerfil, cambiarPassword, crearSolicitud, misSolicitudes,
} = require('../controllers/portalController');
const { generarReporteVentasCliente, generarExcelFacturaIndividual } = require('../services/reporteService');
const { generarPDFDte } = require('../services/pdfService');
const { generarXMLDte } = require('../services/xmlService');
const { iniciarPago, confirmarPago } = require('../services/pagoService');

router.use(verificarTokenCliente);

router.get('/perfil', perfil);
router.put('/perfil', actualizarPerfil);
router.post('/cambiar-password', cambiarPassword);

router.get('/facturas', listarMisFacturas);
router.get('/resumen-mensual', resumenMensual);
router.get('/meses-disponibles', mesesDisponibles);

router.post('/solicitudes', crearSolicitud);
router.get('/solicitudes', misSolicitudes);

// Inicia el cobro de una factura (simulado o Stripe real segun configuracion)
router.post('/facturas/:id/pagar', async (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ? AND cliente_id = ?').get(req.params.id, req.cliente.id);
  if (!dte) return res.status(404).json({ error: 'Factura no encontrada.' });
  if (dte.estado !== 'PROCESADO') return res.status(400).json({ error: 'Solo se pueden pagar facturas procesadas.' });

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.cliente.id);

  try {
    const resultado = await iniciarPago({ dte, cliente });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar el pago.', detalle: err.message });
  }
});

// Confirma el pago al volver de la pasarela (o directamente en modo simulacion)
router.post('/facturas/:id/confirmar-pago', async (req, res) => {
  const { sessionId } = req.body;
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ? AND cliente_id = ?').get(req.params.id, req.cliente.id);
  if (!dte) return res.status(404).json({ error: 'Factura no encontrada.' });

  try {
    const resultado = await confirmarPago({ dteId: dte.id, sessionId });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Error al confirmar el pago.', detalle: err.message });
  }
});

router.get('/facturas/excel', async (req, res) => {
  const { mes } = req.query;
  try {
    await generarReporteVentasCliente(res, { clienteId: req.cliente.id, mes });
  } catch (err) {
    res.status(500).json({ error: 'Error generando el reporte.', detalle: err.message });
  }
});

// Descarga del PDF de UNA factura, verificando que pertenezca a este cliente
router.get('/facturas/:id/pdf', (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ? AND cliente_id = ?').get(req.params.id, req.cliente.id);
  if (!dte) return res.status(404).json({ error: 'Factura no encontrada.' });
  const items = db.prepare('SELECT * FROM dte_items WHERE dte_id = ?').all(dte.id);
  generarPDFDte(res, { dte, items });
});

// Descarga del XML de UNA factura, verificando que pertenezca a este cliente
router.get('/facturas/:id/xml', (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ? AND cliente_id = ?').get(req.params.id, req.cliente.id);
  if (!dte) return res.status(404).json({ error: 'Factura no encontrada.' });
  const documento = JSON.parse(dte.json_documento);
  const xml = generarXMLDte({ dte, documento });
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename=DTE-${dte.numero_control}.xml`);
  res.send(xml);
});

// Descarga del Excel de UNA factura, verificando que pertenezca a este cliente
router.get('/facturas/:id/excel', async (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ? AND cliente_id = ?').get(req.params.id, req.cliente.id);
  if (!dte) return res.status(404).json({ error: 'Factura no encontrada.' });
  const items = db.prepare('SELECT * FROM dte_items WHERE dte_id = ?').all(dte.id);
  try {
    await generarExcelFacturaIndividual(res, { dte, items, clienteNombre: req.cliente.nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error generando el Excel.', detalle: err.message });
  }
});

module.exports = router;
