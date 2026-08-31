// src/controllers/clienteController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { enviarCredencialesPortal } = require('../services/mailService');

function listarClientes(req, res) {
  const { q } = req.query;
  let clientes;
  if (q) {
    clientes = db.prepare(`
      SELECT * FROM clientes
      WHERE nombre LIKE ? OR numero_documento LIKE ?
      ORDER BY nombre LIMIT 50
    `).all(`%${q}%`, `%${q}%`);
  } else {
    clientes = db.prepare('SELECT * FROM clientes ORDER BY nombre LIMIT 100').all();
  }
  res.json({ clientes });
}

function obtenerCliente(req, res) {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  res.json({ cliente });
}

function crearCliente(req, res) {
  const {
    tipoDocumento, numeroDocumento, nrc, nombre, codigoActividad, descActividad,
    departamento, municipio, complementoDireccion, telefono, correo, tipoContribuyente,
  } = req.body;

  if (!tipoDocumento || !numeroDocumento || !nombre) {
    return res.status(400).json({ error: 'tipoDocumento, numeroDocumento y nombre son requeridos.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO clientes (
        tipo_documento, numero_documento, nrc, nombre, codigo_actividad, desc_actividad,
        departamento, municipio, complemento_direccion, telefono, correo, tipo_contribuyente
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipoDocumento, numeroDocumento, nrc || null, nombre, codigoActividad || null, descActividad || null,
      departamento || null, municipio || null, complementoDireccion || null, telefono || null,
      correo || null, tipoContribuyente || 'consumidor'
    );

    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ cliente });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese documento.' });
    }
    res.status(500).json({ error: 'Error al crear cliente.', detalle: err.message });
  }
}

function actualizarCliente(req, res) {
  const { id } = req.params;
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

  const campos = req.body;
  const columnas = {
    tipoDocumento: 'tipo_documento', numeroDocumento: 'numero_documento', nrc: 'nrc',
    nombre: 'nombre', codigoActividad: 'codigo_actividad', descActividad: 'desc_actividad',
    departamento: 'departamento', municipio: 'municipio', complementoDireccion: 'complemento_direccion',
    telefono: 'telefono', correo: 'correo', tipoContribuyente: 'tipo_contribuyente',
  };

  const sets = [];
  const valores = [];
  for (const [key, col] of Object.entries(columnas)) {
    if (campos[key] !== undefined) {
      sets.push(`${col} = ?`);
      valores.push(campos[key]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });

  valores.push(id);
  db.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).run(...valores);

  const actualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  res.json({ cliente: actualizado });
}

function eliminarCliente(req, res) {
  const { id } = req.params;
  db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  res.json({ mensaje: 'Cliente eliminado.' });
}

/**
 * Habilita (o cambia) el acceso del cliente a su portal, asignando una contrasena.
 * Requiere que el cliente ya tenga un correo registrado.
 */
async function habilitarPortal(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
  }

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  if (!cliente.correo) {
    return res.status(400).json({ error: 'El cliente necesita un correo registrado antes de habilitar su portal.' });
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE clientes SET password_hash = ?, portal_activo = 1 WHERE id = ?').run(hash, id);

  // Se envia el correo con las credenciales, pero si falla no se revierte
  // la habilitacion del portal: solo se informa en la respuesta.
  const resultadoCorreo = await enviarCredencialesPortal({
    nombre: cliente.nombre,
    correo: cliente.correo,
    password,
  });

  res.json({
    mensaje: `Acceso al portal habilitado para ${cliente.correo}.`,
    correoEnviado: resultadoCorreo.enviado,
    correoModo: resultadoCorreo.modo,
    correoError: resultadoCorreo.error || null,
  });
}

function desactivarPortal(req, res) {
  const { id } = req.params;
  db.prepare('UPDATE clientes SET portal_activo = 0 WHERE id = ?').run(id);
  res.json({ mensaje: 'Acceso al portal desactivado.' });
}

module.exports = {
  listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente,
  habilitarPortal, desactivarPortal,
};
