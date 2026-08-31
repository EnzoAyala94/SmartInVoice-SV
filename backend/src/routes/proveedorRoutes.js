const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const {
    listarProveedores, obtenerProveedor, crearProveedor, actualizarProveedor, eliminarProveedor,
} = require('../controllers/proveedorController');

router.use(verificarToken);

// El registro de proveedores/compras es trabajo contable: el rol contador
// tiene acceso completo aqui (a diferencia de la emision de DTE al MH).
const ROLES_COMPRAS = ['admin', 'superadmin', 'facturador', 'contador'];

router.get('/', listarProveedores);
router.get('/:id', obtenerProveedor);
router.post('/', requiereRol(...ROLES_COMPRAS), crearProveedor);
router.put('/:id', requiereRol(...ROLES_COMPRAS), actualizarProveedor);
router.delete('/:id', requiereRol(...ROLES_COMPRAS), eliminarProveedor);

module.exports = router;
