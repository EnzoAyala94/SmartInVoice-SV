const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const db = require('../config/db');
const { generarReporteVentas, generarResumenIVA, generarExcelResumenIVA } = require('../services/reporteService');

router.use(verificarToken);

router.get('/ventas/excel', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    await generarReporteVentas(res, { desde, hasta });
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte.', detalle: err.message });
  }
});

router.get('/iva', (req, res) => {
  const { mes } = req.query;
  if (!mes) return res.status(400).json({ error: 'El parametro mes (YYYY-MM) es requerido.' });
  const resumen = generarResumenIVA({ mes });
  res.json({ resumen });
});

router.get('/iva/excel', async (req, res) => {
  const { mes } = req.query;
  if (!mes) return res.status(400).json({ error: 'El parametro mes (YYYY-MM) es requerido.' });
  try {
    const resumen = generarResumenIVA({ mes });
    await generarExcelResumenIVA(res, resumen);
  } catch (err) {
    res.status(500).json({ error: 'Error generando el reporte.', detalle: err.message });
  }
});

router.get('/dashboard', (req, res) => {
  const totalesPorEstado = db.prepare(`
    SELECT estado, COUNT(*) as cantidad, SUM(monto_total) as total
    FROM dtes GROUP BY estado
  `).all();

  const ventasHoy = db.prepare(`
    SELECT COALESCE(SUM(monto_total), 0) as total, COUNT(*) as cantidad
    FROM dtes WHERE fecha_emision = date('now') AND estado != 'ANULADO'
  `).get();

  const ventasMes = db.prepare(`
    SELECT COALESCE(SUM(monto_total), 0) as total, COUNT(*) as cantidad
    FROM dtes WHERE strftime('%Y-%m', fecha_emision) = strftime('%Y-%m', 'now') AND estado != 'ANULADO'
  `).get();

  const ultimosDtes = db.prepare(`
    SELECT d.id, d.numero_control, d.fecha_emision, d.monto_total, d.estado,
           COALESCE(c.nombre, 'Consumidor Final') as cliente
    FROM dtes d LEFT JOIN clientes c ON d.cliente_id = c.id
    ORDER BY d.creado_en DESC LIMIT 10
  `).all();

  res.json({ totalesPorEstado, ventasHoy, ventasMes, ultimosDtes });
});

module.exports = router;
