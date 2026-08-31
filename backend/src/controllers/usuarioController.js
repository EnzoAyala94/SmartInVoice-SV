// src/controllers/usuarioController.js
const bcrypt = require('bcryptjs');
const db = require('../config/db');

function listarUsuarios(req, res) {
  const usuarios = db.prepare(`
    SELECT u.id, u.nombre_completo, u.email, u.activo, r.nombre as rol
    FROM usuarios u JOIN roles r ON u.rol_id = r.id
    ORDER BY u.nombre_completo
  `).all();
  res.json({ usuarios });
}

async function crearUsuario(req, res) {
  const { nombreCompleto, email, password, rol } = req.body;

  if (!nombreCompleto || !email || !password || !rol) {
    return res.status(400).json({ error: 'nombreCompleto, email, password y rol son requeridos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
  }

  const rolRow = db.prepare('SELECT id FROM roles WHERE nombre = ?').get(rol);
  if (!rolRow) {
    return res.status(400).json({ error: `Rol '${rol}' no existe. Usa: admin, facturador o contador.` });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
      VALUES (?, ?, ?, ?)
    `).run(nombreCompleto, email, hash, rolRow.id);

    res.status(201).json({
      usuario: { id: result.lastInsertRowid, nombreCompleto, email, rol },
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    res.status(500).json({ error: 'Error al crear usuario.', detalle: err.message });
  }
}

function cambiarEstado(req, res) {
  const { id } = req.params;
  const { activo } = req.body;
  db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(activo ? 1 : 0, id);
  res.json({ mensaje: activo ? 'Usuario activado.' : 'Usuario desactivado.' });
}

async function restablecerPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
  }

  const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, id);

  res.json({ mensaje: 'Contrasena restablecida correctamente.' });
}

module.exports = { listarUsuarios, crearUsuario, cambiarEstado, restablecerPassword };
