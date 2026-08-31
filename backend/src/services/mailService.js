// src/services/mailService.js
const nodemailer = require('nodemailer');
const mail = require('../config/mail');

let transportador = null;

function obtenerTransportador() {
  if (transportador) return transportador;
  transportador = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: {
      user: mail.usuario,
      pass: mail.password,
    },
  });
  return transportador;
}

function plantillaCredencialesPortal({ nombre, correo, password }) {
  const asunto = 'Acceso a tu Portal de Facturacion';
  const texto = `Hola ${nombre},

Ya tienes acceso al portal donde puedes consultar tus facturas, ver tus pagos mensuales y descargar tus comprobantes.

Correo de acceso: ${correo}
Contrasena: ${password}

Puedes ingresar aqui: ${mail.urlPortal}

Por seguridad, te recomendamos no compartir esta contrasena con nadie.

Saludos.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #10192b;">
      <h2 style="color: #17335c;">Acceso a tu Portal de Facturacion</h2>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Ya tienes acceso al portal donde puedes consultar tus facturas, ver tus pagos mensuales y descargar tus comprobantes.</p>
      <table style="margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #4a5670;">Correo de acceso:</td>
          <td style="padding: 6px 0; font-weight: bold;">${correo}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #4a5670;">Contrasena:</td>
          <td style="padding: 6px 0; font-weight: bold;">${password}</td>
        </tr>
      </table>
      <p>
        <a href="${mail.urlPortal}" style="background: #a97c1e; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ingresar a mi portal
        </a>
      </p>
      <p style="font-size: 12px; color: #8892a6; margin-top: 24px;">
        Por seguridad, no compartas esta contrasena con nadie.
      </p>
    </div>
  `;

  return { asunto, texto, html };
}

/**
 * Envia (o simula) el correo con las credenciales del Portal del Cliente.
 * Devuelve { enviado: boolean, modo: 'simulacion'|'real', error?: string }
 */
async function enviarCredencialesPortal({ nombre, correo, password }) {
  const { asunto, texto, html } = plantillaCredencialesPortal({ nombre, correo, password });

  if (mail.modo === 'simulacion') {
    console.log('\n=== CORREO SIMULADO (modo simulacion, no se envio realmente) ===');
    console.log(`Para: ${correo}`);
    console.log(`Asunto: ${asunto}`);
    console.log(texto);
    console.log('=== FIN DEL CORREO SIMULADO ===\n');
    return { enviado: true, modo: 'simulacion' };
  }

  try {
    const transportador = obtenerTransportador();
    await transportador.sendMail({
      from: mail.remitente,
      to: correo,
      subject: asunto,
      text: texto,
      html,
    });
    return { enviado: true, modo: 'real' };
  } catch (error) {
    console.error('Error enviando correo de credenciales:', error.message);
    return { enviado: false, modo: 'real', error: error.message };
  }
}

module.exports = { enviarCredencialesPortal };
