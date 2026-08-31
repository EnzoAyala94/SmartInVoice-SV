// src/services/firmaService.js
// En produccion, la firma de un DTE se realiza enviando el JSON al
// "Servicio de Firma Electronica" (SVFE, componente Java que Hacienda
// distribuye y que corre localmente, en la misma maquina que este backend,
// con el certificado/llave privada del contribuyente instalados) que
// devuelve un JWT firmado (header.payload.signature).
//
// En modo simulacion se genera un JWT con firma falsa, para poder
// desarrollar y probar el flujo completo sin depender del SVFE real.
//
// IMPORTANTE sobre el modo real: el contrato exacto (endpoint, forma del
// body y de la respuesta) es el que documenta Hacienda para el SVFE. Aqui
// se implementa el contrato mas comunmente documentado, pero antes de usar
// esto contra tu SVFE real DEBES confirmar el formato de respuesta contra
// la documentacion oficial / la version del SVFE que instales, porque puede
// variar entre versiones.

const axios = require('axios');
const crypto = require('crypto');

const FIRMADOR_URL = process.env.FIRMADOR_URL || 'http://localhost:8113/firmardocumento/';
const FIRMADOR_TIMEOUT_MS = Number(process.env.FIRMADOR_TIMEOUT_MS || 15000);

/**
 * Simula la firma de un documento DTE (para MH_MODO=simulacion).
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

/**
 * Llama al Servicio de Firma Electronica (SVFE) real, instalado y corriendo
 * localmente (normalmente en http://localhost:8113), para firmar el
 * documento DTE con el certificado del contribuyente.
 *
 * Variables de entorno requeridas:
 *   - EMISOR_NIT: NIT del contribuyente (el mismo con el que se registro el
 *     certificado ante el MH).
 *   - FIRMADOR_PASSWORD: password de la llave privada del certificado
 *     (la que se definio al generar/instalar el certificado en el SVFE).
 *   - FIRMADOR_URL (opcional): URL del SVFE si no corre en el puerto por
 *     defecto (http://localhost:8113/firmardocumento/).
 */
async function firmarDocumentoReal(documento) {
  const nit = process.env.EMISOR_NIT;
  const passwordPri = process.env.FIRMADOR_PASSWORD;

  if (!nit || !passwordPri) {
    throw new Error(
      'Faltan EMISOR_NIT y/o FIRMADOR_PASSWORD en el entorno. Son requeridos para firmar con el SVFE real.'
    );
  }

  let respuesta;
  try {
    respuesta = await axios.post(
      FIRMADOR_URL,
      {
        nit,
        activo: true,
        passwordPri,
        dteJson: documento,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: FIRMADOR_TIMEOUT_MS,
      }
    );
  } catch (error) {
    // El SVFE no respondio o no esta corriendo (ej. no instalado, apagado,
    // puerto equivocado, o corriendo en otra maquina que este backend no
    // puede alcanzar por localhost).
    const detalle = error.response?.data || error.message;
    throw new Error(
      `No se pudo contactar el servicio de firmador (SVFE) en ${FIRMADOR_URL}: ${JSON.stringify(detalle)}`
    );
  }

  const data = respuesta.data;

  // El SVFE del MH normalmente responde { status: "OK", body: "<jwt firmado>" }
  // ante exito, y { status: "ERROR", ... } ante fallo. Verifica esto contra
  // tu version real del SVFE y ajusta si tu respuesta trae otra forma.
  if (data?.status !== 'OK' || !data?.body) {
    throw new Error(
      `El servicio de firmador (SVFE) rechazo el documento: ${JSON.stringify(data)}`
    );
  }

  return data.body; // JWT firmado (header.payload.signature)
}

async function firmarDocumento(documento, modoMh) {
  if (modoMh === 'real') {
    return firmarDocumentoReal(documento);
  }

  return firmarDocumentoSimulado(documento);
}

module.exports = { firmarDocumento };
