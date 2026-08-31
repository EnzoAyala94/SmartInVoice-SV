// src/services/mhService.js
// Maneja la autenticacion y transmision de DTEs al Ministerio de Hacienda.
// Soporta modo 'simulacion' (para desarrollo, sin credenciales reales) y
// modo 'real' (llamadas efectivas a la API de Hacienda, requiere credenciales).

const axios = require('axios');
const { mh } = require('../config/emisor');

let tokenCache = { token: null, expira: 0 };

/**
 * Autenticacion contra el MH. En modo real usa OAuth2 (usuario/password del NIT).
 */
async function autenticarMH() {
  if (mh.modo === 'simulacion') {
    return 'TOKEN_SIMULADO_' + Date.now();
  }

  if (tokenCache.token && Date.now() < tokenCache.expira) {
    return tokenCache.token;
  }

  const params = new URLSearchParams();
  params.append('user', mh.usuario);
  params.append('pwd', mh.password);

  const resp = await axios.post(mh.authUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const token = resp.data?.body?.token;
  tokenCache = { token, expira: Date.now() + 30 * 60 * 1000 }; // ~30 min
  return token;
}

/**
 * Transmite el documento firmado (JWT) al servicio de recepcion del MH.
 * En modo simulacion, genera una respuesta de aceptacion ficticia con
 * un sello de recepcion falso, util para probar todo el flujo end-to-end.
 */
async function transmitirDTE({ documento, documentoFirmado, codigoGeneracion }) {
  if (mh.modo === 'simulacion') {
    // Simula latencia de red
    await new Promise((r) => setTimeout(r, 400));

    const selloSimulado = `SIMULADO-${codigoGeneracion}-${Date.now()}`;
    return {
      exito: true,
      estado: 'PROCESADO',
      selloRecepcion: selloSimulado,
      respuestaCruda: {
        version: 1,
        ambiente: mh.ambiente,
        version_app: 1,
        estado: 'PROCESADO',
        codigoGeneracion,
        selloRecibido: selloSimulado,
        fhProcesamiento: new Date().toISOString(),
        clasificaMsg: 'INFORMATIVO',
        codigoMsg: '001',
        descripcionMsg: 'DTE recibido y procesado correctamente (SIMULADO).',
        observaciones: [],
      },
    };
  }

  // ---- MODO REAL ----
  const token = await autenticarMH();

  const body = {
    ambiente: mh.ambiente,
    idEnvio: 1,
    version: documento.identificacion.version,
    tipoDte: documento.identificacion.tipoDte,
    documento: documentoFirmado, // el JWT firmado
  };

  try {
    const resp = await axios.post(mh.recepcionUrl, body, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });

    const data = resp.data;
    const aceptado = data.estado === 'PROCESADO';

    return {
      exito: aceptado,
      estado: aceptado ? 'PROCESADO' : 'RECHAZADO',
      selloRecepcion: data.selloRecibido || null,
      respuestaCruda: data,
    };
  } catch (error) {
    return {
      exito: false,
      estado: 'CONTINGENCIA',
      selloRecepcion: null,
      respuestaCruda: error.response?.data || { error: error.message },
    };
  }
}

module.exports = { autenticarMH, transmitirDTE };
