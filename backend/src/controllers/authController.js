// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos.' });
  }

  const usuario = db.prepare(`
    SELECT u.*, r.nombre as rol_nombre
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.email = ? AND u.activo = 1
  `).get(email);

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValido) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol_nombre, nombre: usuario.nombre_completo, tipo: 'usuario' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({
    mensaje: 'Login exitoso',
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol_nombre,
    },
    token, // tambien se envia por si el frontend prefiere Bearer token
  });
}

/**
 * Login del Portal del Cliente. Usa una cookie/token separado (token_cliente)
 * para no mezclar sesiones de usuarios internos con sesiones de clientes.
 */
async function loginCliente(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos.' });
  }

  const cliente = db.prepare(`
    SELECT * FROM clientes WHERE correo = ? AND portal_activo = 1
  `).get(email);

  if (!cliente || !cliente.password_hash) {
    return res.status(401).json({ error: 'Credenciales invalidas o portal no habilitado.' });
  }

  const passwordValido = await bcrypt.compare(password, cliente.password_hash);
  if (!passwordValido) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const token = jwt.sign(
    { id: cliente.id, email: cliente.correo, nombre: cliente.nombre, tipo: 'cliente' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.cookie('token_cliente', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({
    mensaje: 'Login exitoso',
    cliente: { id: cliente.id, nombre: cliente.nombre, correo: cliente.correo },
    token,
  });
}

function logoutCliente(req, res) {
  res.clearCookie('token_cliente');
  res.json({ mensaje: 'Sesion cerrada.' });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ mensaje: 'Sesion cerrada.' });
}

function perfil(req, res) {
  res.json({ usuario: req.usuario });
}

module.exports = { login, logout, perfil, loginCliente, logoutCliente };
