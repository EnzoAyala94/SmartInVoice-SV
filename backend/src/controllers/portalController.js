// src/controllers/portalController.js
const bcrypt = require('bcryptjs');
const db = require('../config/db');

function perfil(req, res) {
  const cliente = db.prepare(`
    SELECT id, nombre, correo, telefono, tipo_documento, numero_documento, nrc,
           departamento, municipio, complemento_direccion
    FROM clientes WHERE id = ?
  `).get(req.cliente.id);
  res.json({ cliente });
}

/**
 * Permite al cliente actualizar sus propios datos de contacto (correo,
 * telefono, direccion). No puede modificar su nombre, documento ni NRC desde
 * aqui (eso requiere que el emisor los edite, para mantener la integridad fiscal).
 */
function actualizarPerfil(req, res) {
  const { correo, telefono, departamento, municipio, complementoDireccion } = req.body;

  if (!correo) {
    return res.status(400).json({ error: 'El correo es requerido.' });
  }

  try {
    db.prepare(`
      UPDATE clientes SET correo = ?, telefono = ?, departamento = ?, municipio = ?, complemento_direccion = ?
      WHERE id = ?
    `).run(correo, telefono || null, departamento || null, municipio || null, complementoDireccion || null, req.cliente.id);

    const actualizado = db.prepare(`
      SELECT id, nombre, correo, telefono, departamento, municipio, complemento_direccion
      FROM clientes WHERE id = ?
    `).get(req.cliente.id);

    res.json({
      cliente: actualizado,
      mensaje: correo !== req.cliente.email
        ? 'Datos actualizados. La proxima vez que inicies sesion, usa tu nuevo correo.'
        : 'Datos actualizados correctamente.',
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ese correo ya esta en uso por otro registro.' });
    }
    res.status(500).json({ error: 'Error al actualizar los datos.', detalle: err.message });
  }
}

/**
 * Permite al cliente cambiar su propia contrasena, verificando la actual.
 */
async function cambiarPassword(req, res) {
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva) {
    return res.status(400).json({ error: 'passwordActual y passwordNueva son requeridas.' });
  }
  if (passwordNueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres.' });
  }

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.cliente.id);
  if (!cliente || !cliente.password_hash) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  const valido = await bcrypt.compare(passwordActual, cliente.password_hash);
  if (!valido) {
    return res.status(401).json({ error: 'La contrasena actual no es correcta.' });
  }

  const hash = await bcrypt.hash(passwordNueva, 10);
  db.prepare('UPDATE clientes SET password_hash = ? WHERE id = ?').run(hash, req.cliente.id);

  res.json({ mensaje: 'Contrasena actualizada correctamente.' });
}

/**
 * Lista los DTEs del cliente autenticado, opcionalmente filtrados por mes (YYYY-MM).
 */
function listarMisFacturas(req, res) {
  const clienteId = req.cliente.id;
  const { mes } = req.query; // formato 'YYYY-MM'

  let query = `
    SELECT id, numero_control, codigo_generacion, tipo_dte, fecha_emision,
           monto_total, monto_gravado, monto_iva, estado, pagado, fecha_pago, metodo_pago
    FROM dtes
    WHERE cliente_id = ?
  `;
  const params = [clienteId];

  if (mes) {
    query += ` AND strftime('%Y-%m', fecha_emision) = ?`;
    params.push(mes);
  }

  query += ' ORDER BY fecha_emision DESC';

  const facturas = db.prepare(query).all(...params);
  res.json({ facturas });
}

/**
 * Devuelve los totales pagados mes a mes (ultimos 12 meses) para graficar.
 * Solo cuenta documentos PROCESADOS (no anulados ni rechazados).
 */
function resumenMensual(req, res) {
  const clienteId = req.cliente.id;

  const filas = db.prepare(`
    SELECT strftime('%Y-%m', fecha_emision) as mes,
           SUM(monto_total) as total,
           COUNT(*) as cantidad
    FROM dtes
    WHERE cliente_id = ? AND estado = 'PROCESADO'
      AND fecha_emision >= date('now', '-12 months')
    GROUP BY mes
    ORDER BY mes ASC
  `).all(clienteId);

  res.json({ resumen: filas });
}

/**
 * Devuelve la lista de meses (YYYY-MM) en los que el cliente tiene al menos un DTE,
 * para poblar el selector de "meses anteriores" en el portal.
 */
function mesesDisponibles(req, res) {
  const clienteId = req.cliente.id;
  const meses = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', fecha_emision) as mes
    FROM dtes WHERE cliente_id = ?
    ORDER BY mes DESC
  `).all(clienteId);
  res.json({ meses: meses.map((m) => m.mes) });
}

/**
 * El cliente crea una solicitud: puede ser para reportar un error en una
 * factura ya emitida ('correccion', requiere dteId) o para pedir que se le
 * emita una factura nueva ('nueva_factura').
 */
function crearSolicitud(req, res) {
  const { tipo, dteId, mensaje } = req.body;

  if (!tipo || !['correccion', 'nueva_factura'].includes(tipo)) {
    return res.status(400).json({ error: "tipo debe ser 'correccion' o 'nueva_factura'." });
  }
  if (!mensaje || !mensaje.trim()) {
    return res.status(400).json({ error: 'Debes escribir un mensaje describiendo tu solicitud.' });
  }
  if (tipo === 'correccion' && !dteId) {
    return res.status(400).json({ error: 'Debes indicar a que factura se refiere la correccion.' });
  }

  if (dteId) {
    const dte = db.prepare('SELECT id FROM dtes WHERE id = ? AND cliente_id = ?').get(dteId, req.cliente.id);
    if (!dte) return res.status(404).json({ error: 'Esa factura no pertenece a tu cuenta.' });
  }

  const result = db.prepare(`
    INSERT INTO solicitudes_cliente (cliente_id, tipo, dte_id, mensaje)
    VALUES (?, ?, ?, ?)
  `).run(req.cliente.id, tipo, dteId || null, mensaje.trim());

  res.status(201).json({ mensaje: 'Solicitud enviada. Te avisaremos cuando sea atendida.', solicitudId: result.lastInsertRowid });
}

/**
 * Lista las solicitudes que el cliente autenticado ha creado, con su estado.
 */
function misSolicitudes(req, res) {
  const solicitudes = db.prepare(`
    SELECT s.*, d.numero_control as dte_numero_control
    FROM solicitudes_cliente s
    LEFT JOIN dtes d ON s.dte_id = d.id
    WHERE s.cliente_id = ?
    ORDER BY s.creado_en DESC
  `).all(req.cliente.id);
  res.json({ solicitudes });
}

module.exports = {
  perfil, listarMisFacturas, resumenMensual, mesesDisponibles,
  actualizarPerfil, cambiarPassword, crearSolicitud, misSolicitudes,
};
