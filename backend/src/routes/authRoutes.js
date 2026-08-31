const express = require('express');
const router = express.Router();
const { login, logout, perfil, loginCliente, logoutCliente } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/perfil', verificarToken, perfil);

// Portal del Cliente
router.post('/cliente-login', loginCliente);
router.post('/cliente-logout', logoutCliente);

module.exports = router;
