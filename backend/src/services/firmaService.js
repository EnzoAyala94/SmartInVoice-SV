// src/services/firmaService.js
// En produccion, la firma de un DTE se realiza enviando el JSON al
// "Servicio de Firma Electronica" (SVFE, componente Java que corre localmente
// con el certificado/llave del contribuyente) que devuelve un JWT firmado.
// Aqui se simula ese proceso para poder desarrollar y probar el flujo completo
// sin depender del componente de firma real.

const crypto = require('crypto');

/**
 * Simula la firma de un documento DTE.
 * En un entorno real esto seria una llamada HTTP al servicio de firmador:
 *   POST http://localhost:8113/firmardocumento/
 *   { nit, activo: true, dteJson: documento }
 * y la respuesta seria un JWT (header.payload.signature) firmado con la
 * llave privada del certificado del contribuyente.
 */
function firmarDocumentoSimulado(documento) {
  const payload = Buffer.from(JSON.stringify(documento)).toString('base64url');
  const header = Buffer.from(JSON.stringify({ alg: 'SIMULADO', typ: 'JWT' })).toString('base64url');
  const firma = crypto
    .createHash('sha256')
    .update(`${header}.${payload}.SECRETO_SIMULADO`)
    .digest('base64url');

  return `${header}.${payload}.${firma}`;
}

async function firmarDocumento(documento, modoMh) {
  if (modoMh === 'real') {
    // Aqui iria la llamada real al servicio de firmador local (Java) del MH.
    // Ejemplo (comentado para referencia futura):
    //
    // const axios = require('axios');
    // const resp = await axios.post('http://localhost:8113/firmardocumento/', {
    //   nit: process.env.EMISOR_NIT,
    //   activo: true,
    //   passwordPri: process.env.FIRMADOR_PASSWORD,
    //   dteJson: documento,
    // });
    // return resp.data.body; // el JWT firmado
    throw new Error('Modo real de firma no configurado. Configura el servicio de firmador del MH.');
  }

  return firmarDocumentoSimulado(documento);
}

module.exports = { firmarDocumento };
