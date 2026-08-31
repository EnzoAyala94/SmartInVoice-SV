// src/config/emisor.js
// Datos fiscales del emisor y configuracion de conexion al Ministerio de Hacienda

module.exports = {
  emisor: {
    nit: process.env.EMISOR_NIT,
    nrc: process.env.EMISOR_NRC,
    nombre: process.env.EMISOR_NOMBRE,
    codActividad: process.env.EMISOR_COD_ACTIVIDAD,
    descActividad: process.env.EMISOR_DESC_ACTIVIDAD,
    nombreComercial: process.env.EMISOR_NOMBRE_COMERCIAL,
    tipoEstablecimiento: process.env.EMISOR_TIPO_ESTABLECIMIENTO,
    direccion: {
      departamento: process.env.EMISOR_DEPARTAMENTO,
      municipio: process.env.EMISOR_MUNICIPIO,
      complemento: process.env.EMISOR_COMPLEMENTO,
    },
    telefono: process.env.EMISOR_TELEFONO,
    correo: process.env.EMISOR_CORREO,
    codEstablecimiento: '0001',
    codPuntoVenta: '0001',
  },
  mh: {
    modo: process.env.MH_MODO || 'simulacion', // 'simulacion' | 'real'
    ambiente: process.env.MH_AMBIENTE || '00',
    authUrl: process.env.MH_API_AUTH_URL,
    recepcionUrl: process.env.MH_API_RECEPCION_URL,
    usuario: process.env.MH_USER,
    password: process.env.MH_PASSWORD,
  },
};
