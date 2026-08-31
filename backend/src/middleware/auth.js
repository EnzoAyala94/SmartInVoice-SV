// src/middleware/auth.js
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Token no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion.' });
    }
    next();
  };
}

/**
 * Verifica el token del Portal del Cliente (cookie separada 'token_cliente').
 * Adjunta req.cliente = { id, email, nombre, tipo: 'cliente' }.
 */
function verificarTokenCliente(req, res, next) {
  const token = req.cookies?.token_cliente || req.headers['x-portal-token'];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado en el portal.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Token invalido para este portal.' });
    }
    req.cliente = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

module.exports = { verificarToken, requiereRol, verificarTokenCliente };
