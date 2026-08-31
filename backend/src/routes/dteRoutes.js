const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const db = require('../config/db');
const {
  emitirDTE, listarDTEs, obtenerDTE, anularDTE,
} = require('../controllers/dteController');
const { generarPDFDte } = require('../services/pdfService');
const { generarXMLDte } = require('../services/xmlService');
const { generarExcelFacturaIndividual } = require('../services/reporteService');

router.use(verificarToken);

router.post('/', requiereRol('admin', 'facturador', 'contador'), emitirDTE);
router.get('/', listarDTEs);
router.get('/:id', obtenerDTE);
router.post('/:id/anular', requiereRol('admin', 'facturador', 'contador'), anularDTE);

router.get('/:id/pdf', (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ?').get(req.params.id);
  if (!dte) return res.status(404).json({ error: 'DTE no encontrado.' });
  const items = db.prepare('SELECT * FROM dte_items WHERE dte_id = ?').all(req.params.id);
  generarPDFDte(res, { dte, items });
});

router.get('/:id/xml', (req, res) => {
  const dte = db.prepare('SELECT * FROM dtes WHERE id = ?').get(req.params.id);
  if (!dte) return res.status(404).json({ error: 'DTE no encontrado.' });
  const documento = JSON.parse(dte.json_documento);
  const xml = generarXMLDte({ dte, documento });
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename=DTE-${dte.numero_control}.xml`);
  res.send(xml);
});

router.get('/:id/excel', async (req, res) => {
  const dte = db.prepare(`
    SELECT d.*, c.nombre as cliente_nombre FROM dtes d
    LEFT JOIN clientes c ON d.cliente_id = c.id WHERE d.id = ?
  `).get(req.params.id);
  if (!dte) return res.status(404).json({ error: 'DTE no encontrado.' });
  const items = db.prepare('SELECT * FROM dte_items WHERE dte_id = ?').all(dte.id);
  try {
    await generarExcelFacturaIndividual(res, { dte, items, clienteNombre: dte.cliente_nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error generando el Excel.', detalle: err.message });
  }
});

module.exports = router;
