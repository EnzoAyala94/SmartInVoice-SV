// src/services/pagoService.js
const db = require('../config/db');
const pagos = require('../config/pagos');

let stripeClient = null;
function obtenerStripe() {
  if (stripeClient) return stripeClient;
  const Stripe = require('stripe');
  stripeClient = new Stripe(pagos.stripeSecretKey);
  return stripeClient;
}

function marcarComoPagado(dteId, metodo) {
  db.prepare(`
    UPDATE dtes SET pagado = 1, fecha_pago = datetime('now'), metodo_pago = ? WHERE id = ?
  `).run(metodo, dteId);
}

/**
 * Inicia el cobro de una factura. En modo simulacion, la marca como pagada
 * de inmediato (no hay cobro real). En modo real, crea una sesion de pago
 * de Stripe Checkout y devuelve la URL a la que hay que redirigir al cliente.
 */
async function iniciarPago({ dte, cliente }) {
  if (dte.pagado) {
    return { yaPagado: true };
  }

  if (pagos.modo === 'simulacion') {
    marcarComoPagado(dte.id, 'simulado');
    return { modo: 'simulacion', pagado: true };
  }

  if (!pagos.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY no esta configurada. Revisa tu archivo .env.');
  }

  const stripe = obtenerStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Factura ${dte.numero_control}` },
        unit_amount: Math.round(dte.monto_total * 100),
      },
      quantity: 1,
    }],
    customer_email: cliente?.correo || undefined,
    success_url: `${pagos.frontendUrl}/portal/pago-exitoso?dteId=${dte.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${pagos.frontendUrl}/portal?pago=cancelado`,
  });

  db.prepare('UPDATE dtes SET stripe_session_id = ? WHERE id = ?').run(session.id, dte.id);

  return { modo: 'real', url: session.url };
}

/**
 * Confirma un pago real de Stripe al volver de la pasarela (pantalla de
 * exito), verificando directamente con Stripe que el pago se completo.
 */
async function confirmarPago({ dteId, sessionId }) {
  if (pagos.modo === 'simulacion') {
    marcarComoPagado(dteId, 'simulado');
    return { pagado: true };
  }

  const stripe = obtenerStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    marcarComoPagado(dteId, 'stripe');
    return { pagado: true };
  }

  return { pagado: false, estado: session.payment_status };
}

module.exports = { iniciarPago, confirmarPago };
