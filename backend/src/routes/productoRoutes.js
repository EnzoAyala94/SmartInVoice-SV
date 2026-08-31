const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
  listarProductos, crearProducto, actualizarProducto, eliminarProducto,
} = require('../controllers/productoController');

router.use(verificarToken);
router.get('/', listarProductos);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

module.exports = router;
