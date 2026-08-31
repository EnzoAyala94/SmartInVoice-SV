// src/config/pagos.js
// Configuracion de la pasarela de pagos. Igual que con el MH y el correo,
// soporta 'simulacion' (no cobra nada real, marca la factura como pagada al
// instante) para poder probar el flujo completo sin necesidad de una cuenta
// de Stripe todavia.

module.exports = {
  modo: process.env.PAGOS_MODO || 'simulacion', // 'simulacion' | 'real'
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim(),
};
