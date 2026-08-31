// src/controllers/productoController.js
const db = require('../config/db');

function listarProductos(req, res) {
  const { q } = req.query;
  let productos;
  if (q) {
    productos = db.prepare(`
      SELECT * FROM productos WHERE (descripcion LIKE ? OR codigo LIKE ?) AND activo = 1
      ORDER BY descripcion LIMIT 50
    `).all(`%${q}%`, `%${q}%`);
  } else {
    productos = db.prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY descripcion LIMIT 200').all();
  }
  res.json({ productos });
}

function crearProducto(req, res) {
  const { codigo, descripcion, tipoItem, precioUnitario, gravado, unidadMedida } = req.body;

  if (!codigo || !descripcion || precioUnitario === undefined) {
    return res.status(400).json({ error: 'codigo, descripcion y precioUnitario son requeridos.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO productos (codigo, descripcion, tipo_item, precio_unitario, gravado, unidad_medida)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(codigo, descripcion, tipoItem || 1, precioUnitario, gravado === false ? 0 : 1, unidadMedida || 59);

    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ producto });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un producto con ese codigo.' });
    }
    res.status(500).json({ error: 'Error al crear producto.', detalle: err.message });
  }
}

function actualizarProducto(req, res) {
  const { id } = req.params;
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });

  const { descripcion, precioUnitario, gravado, unidadMedida, activo } = req.body;
  db.prepare(`
    UPDATE productos SET
      descripcion = COALESCE(?, descripcion),
      precio_unitario = COALESCE(?, precio_unitario),
      gravado = COALESCE(?, gravado),
      unidad_medida = COALESCE(?, unidad_medida),
      activo = COALESCE(?, activo)
    WHERE id = ?
  `).run(descripcion, precioUnitario, gravado, unidadMedida, activo, id);

  const actualizado = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  res.json({ producto: actualizado });
}

function eliminarProducto(req, res) {
  const { id } = req.params;
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);
  res.json({ mensaje: 'Producto desactivado.' });
}

module.exports = { listarProductos, crearProducto, actualizarProducto, eliminarProducto };
