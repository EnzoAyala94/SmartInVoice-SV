// src/controllers/solicitudController.js
const db = require('../config/db');

function listarSolicitudes(req, res) {
  const { estado } = req.query;

  let query = `
    SELECT s.*, c.nombre as cliente_nombre, c.correo as cliente_correo,
           d.numero_control as dte_numero_control
    FROM solicitudes_cliente s
    JOIN clientes c ON s.cliente_id = c.id
    LEFT JOIN dtes d ON s.dte_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) {
    query += ' AND s.estado = ?';
    params.push(estado);
  }
  query += ' ORDER BY s.creado_en DESC';

  const solicitudes = db.prepare(query).all(...params);
  res.json({ solicitudes });
}

function responderSolicitud(req, res) {
  const { id } = req.params;
  const { estado, respuestaAdmin } = req.body;

  if (!['ATENDIDA', 'RECHAZADA'].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser 'ATENDIDA' o 'RECHAZADA'." });
  }

  const solicitud = db.prepare('SELECT * FROM solicitudes_cliente WHERE id = ?').get(id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  db.prepare(`
    UPDATE solicitudes_cliente
    SET estado = ?, respuesta_admin = ?, atendido_en = datetime('now')
    WHERE id = ?
  `).run(estado, respuestaAdmin || null, id);

  res.json({ mensaje: 'Solicitud actualizada.' });
}

module.exports = { listarSolicitudes, responderSolicitud };
