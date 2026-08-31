const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const {
  listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente,
  habilitarPortal, desactivarPortal,
} = require('../controllers/clienteController');

router.use(verificarToken);
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', requiereRol('admin', 'superadmin', 'facturador'), crearCliente);
router.put('/:id', requiereRol('admin', 'superadmin', 'facturador'), actualizarCliente);
router.delete('/:id', requiereRol('admin', 'superadmin', 'facturador'), eliminarCliente);
router.post('/:id/portal-acceso', requiereRol('admin', 'superadmin', 'facturador'), habilitarPortal);
router.post('/:id/portal-desactivar', requiereRol('admin', 'superadmin', 'facturador'), desactivarPortal);

module.exports = router;
