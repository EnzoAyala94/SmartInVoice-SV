const express = require('express');
const router = express.Router();
const { verificarToken, requiereRol } = require('../middleware/auth');
const { listarSolicitudes, responderSolicitud } = require('../controllers/solicitudController');

router.use(verificarToken);

router.get('/', listarSolicitudes);
router.put('/:id', requiereRol('admin', 'facturador', 'contador'), responderSolicitud);

module.exports = router;
