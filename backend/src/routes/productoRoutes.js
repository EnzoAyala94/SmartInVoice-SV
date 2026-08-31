const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const {
  listarProductos, crearProducto, actualizarProducto, eliminarProducto,
} = require('../controllers/productoController');

router.use(verificarToken);
router.get('/', listarProductos);
router.post('/', requiereRol('admin', 'superadmin', 'facturador'), crearProducto);
router.put('/:id', requiereRol('admin', 'superadmin', 'facturador'), actualizarProducto);
router.delete('/:id', requiereRol('admin', 'superadmin', 'facturador'), eliminarProducto);

module.exports = router;
