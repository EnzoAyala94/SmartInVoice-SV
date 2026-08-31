const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
  listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente,
  habilitarPortal, desactivarPortal,
} = require('../controllers/clienteController');

router.use(verificarToken);
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);
router.post('/:id/portal-acceso', habilitarPortal);
router.post('/:id/portal-desactivar', desactivarPortal);

module.exports = router;
