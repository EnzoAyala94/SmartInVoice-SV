// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Inicializar base de datos automáticamente
const { initializeDatabase } = require('../database/initializeDb');
initializeDatabase();

const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const productoRoutes = require('./routes/productoRoutes');
const dteRoutes = require('./routes/dteRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const portalRoutes = require('./routes/portalRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');

const app = express();

// Necesario cuando el servidor corre detras de un proxy (Render, Railway, etc.)
// para que Express detecte correctamente HTTPS y las cookies "secure" funcionen.
app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan('dev'));
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: origenesPermitidos,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Rate limiting general para prevenir abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting mas estricto para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en unos minutos.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/cliente-login', loginLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/dtes', dteRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/solicitudes', solicitudRoutes);

// Manejo de errores general
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor DTE corriendo en http://localhost:${PORT}`);
  console.log(`Modo MH: ${process.env.MH_MODO || 'simulacion'}`);
});
