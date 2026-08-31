const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const { listarUsuarios, crearUsuario, cambiarEstado, restablecerPassword } = require('../controllers/usuarioController');

router.use(verificarToken);
router.use(requiereRol('admin')); // Solo el admin gestiona usuarios internos

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id/estado', cambiarEstado);
router.post('/:id/restablecer-password', restablecerPassword);

module.exports = router;
