// src/config/mail.js
// Configuracion del envio de correos (credenciales del portal del cliente, etc.)
// Igual que con el MH, soporta 'simulacion' (no envia nada real, solo lo muestra
// en la consola del servidor) para poder probar el flujo sin credenciales SMTP.

module.exports = {
  modo: process.env.MAIL_MODO || 'simulacion', // 'simulacion' | 'real'
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: process.env.MAIL_SECURE === 'true', // true para puerto 465, false para 587/25
  usuario: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  remitente: process.env.MAIL_FROM || 'Facturacion Electronica <no-reply@miempresa.com>',
  urlPortal: process.env.PORTAL_URL || 'http://localhost:5173/portal/login',
};
