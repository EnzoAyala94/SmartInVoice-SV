// src/services/dteService.js
// Construye el documento JSON de un DTE siguiendo la estructura general
// publicada por el Ministerio de Hacienda de El Salvador (v3 esquemas DTE-JSON).
// NOTA: Esta es una implementacion educativa/base. Antes de produccion se debe
// validar contra los esquemas .json oficiales publicados por el MH para cada
// tipo de documento (Factura, CCF, Nota de Credito, etc.)

const { v4: uuidv4 } = require('uuid');
const { emisor } = require('../config/emisor');
const { generarNumeroControl } = require('./correlativoService');

function horaActualElSalvador() {
  const now = new Date();
  return now.toLocaleTimeString('es-SV', { hour12: false, timeZone: 'America/El_Salvador' });
}

function fechaActualElSalvador() {
  const now = new Date();
  // formato YYYY-MM-DD
  const partes = now.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
  return partes;
}

/**
 * Calcula los montos de un item: gravado o exento segun bandera.
 */
function calcularItem(item, numeroItem) {
  const cantidad = Number(item.cantidad);
  const precioUnitario = Number(item.precioUnitario);
  const descuento = Number(item.montoDescuento || 0);
  const subtotal = cantidad * precioUnitario - descuento;

  return {
    numItem: numeroItem,
    tipoItem: item.tipoItem || 1, // 1=Bien, 2=Servicio
    cantidad,
    codigo: item.codigo || null,
    uniMedida: item.unidadMedida || 59,
    descripcion: item.descripcion,
    precioUni: precioUnitario,
    montoDescu: descuento,
    ventaNoSuj: 0,
    ventaExenta: item.gravado ? 0 : subtotal,
    ventaGravada: item.gravado ? subtotal : 0,
    tributos: item.gravado ? ['20'] : null, // 20 = IVA 13%
    psv: 0,
    noGravado: 0,
    ivaItem: item.gravado ? Number((subtotal * 0.13).toFixed(2)) : 0,
  };
}

/**
 * Construye el resumen (totales) del documento a partir de los items calculados.
 */
function calcularResumen(itemsCalculados, condicionOperacion) {
  const totalGravada = itemsCalculados.reduce((acc, i) => acc + i.ventaGravada, 0);
  const totalExenta = itemsCalculados.reduce((acc, i) => acc + i.ventaExenta, 0);
  const totalDescu = itemsCalculados.reduce((acc, i) => acc + i.montoDescu, 0);
  const totalIva = Number((totalGravada * 0.13).toFixed(2));
  const subTotal = Number((totalGravada + totalExenta).toFixed(2));
  const montoTotalOperacion = Number((subTotal + totalIva).toFixed(2));

  return {
    totalNoSuj: 0,
    totalExenta: Number(totalExenta.toFixed(2)),
    totalGravada: Number(totalGravada.toFixed(2)),
    subTotalVentas: subTotal,
    descuNoSuj: 0,
    descuExenta: 0,
    descuGravada: Number(totalDescu.toFixed(2)),
    porcentajeDescuento: 0,
    totalDescu: Number(totalDescu.toFixed(2)),
    tributos: totalGravada > 0 ? [{ codigo: '20', descripcion: 'IVA 13%', valor: totalIva }] : [],
    subTotal,
    ivaRete1: 0,
    reteRenta: 0,
    montoTotalOperacion,
    totalNoGravado: 0,
    totalPagar: montoTotalOperacion,
    totalLetras: numeroALetras(montoTotalOperacion),
    totalIva,
    saldoFavor: 0,
    condicionOperacion: condicionOperacion || 1, // 1=Contado, 2=Credito, 3=Otro
    pagos: [
      {
        codigo: '01', // 01 = Billete/moneda
        montoPago: montoTotalOperacion,
        referencia: '',
        plazo: null,
        periodo: null,
      },
    ],
    numPagoElectronico: '',
  };
}

// Conversion simplificada de numero a letras (para totalLetras del resumen)
function numeroALetras(numero) {
  // Implementacion simplificada; para produccion usar libreria especializada
  const entero = Math.floor(numero);
  const centavos = Math.round((numero - entero) * 100);
  return `${entero} 00/100 DOLARES (VALOR APROXIMADO - REVISAR EN PRODUCCION) ${centavos}/100`;
}

/**
 * Construye el objeto receptor segun sea Consumidor Final o Contribuyente (CCF)
 */
function construirReceptor(cliente, tipoDte) {
  if (!cliente) {
    // Consumidor final sin datos (venta menor a $25 no requiere datos completos)
    return {
      tipoDocumento: null,
      numDocumento: null,
      nrc: null,
      nombre: null,
      codActividad: null,
      descActividad: null,
      direccion: null,
      telefono: null,
      correo: null,
    };
  }

  return {
    tipoDocumento: cliente.tipo_documento,
    numDocumento: cliente.numero_documento,
    nrc: cliente.nrc || null,
    nombre: cliente.nombre,
    codActividad: cliente.codigo_actividad || null,
    descActividad: cliente.desc_actividad || null,
    direccion: cliente.departamento
      ? {
          departamento: cliente.departamento,
          municipio: cliente.municipio,
          complemento: cliente.complemento_direccion,
        }
      : null,
    telefono: cliente.telefono || null,
    correo: cliente.correo || null,
  };
}

/**
 * Funcion principal: construye el documento DTE completo listo para firmar.
 *
 * @param {Object} params
 * @param {string} params.tipoDte - '01' Factura, '03' CCF, '05' Nota Credito, '06' Nota Debito
 * @param {Object|null} params.cliente - registro de la tabla clientes (o null para CF generico)
 * @param {Array} params.items - lista de items {descripcion, cantidad, precioUnitario, gravado, codigo, unidadMedida, montoDescuento, tipoItem}
 * @param {number} params.condicionOperacion - 1 contado, 2 credito, 3 otro
 * @param {Object|null} params.documentoRelacionado - { tipoDocumento, codigoGeneracion, fechaEmision }
 *   del DTE original. Requerido para Notas de Credito/Debito (tipoDte 05/06).
 * @param {string|null} params.motivo - motivo de la Nota de Credito/Debito
 */
function construirDocumentoDTE({ tipoDte, cliente, items, condicionOperacion, documentoRelacionado, motivo }) {
  const codigoGeneracion = uuidv4().toUpperCase();
  const numeroControl = generarNumeroControl(tipoDte);
  const fecha = fechaActualElSalvador();
  const hora = horaActualElSalvador();

  const itemsCalculados = items.map((item, idx) => calcularItem(item, idx + 1));
  const resumen = calcularResumen(itemsCalculados, condicionOperacion);

  const esNotaCreditoODebito = tipoDte === '05' || tipoDte === '06';

  const documento = {
    identificacion: {
      version: (tipoDte === '03' || esNotaCreditoODebito) ? 3 : 1,
      ambiente: process.env.MH_AMBIENTE || '00',
      tipoDte,
      numeroControl,
      codigoGeneracion,
      tipoModelo: 1, // 1 = Modelo facturacion previo
      tipoOperacion: 1, // 1 = Normal
      tipoContingencia: null,
      motivoContin: null,
      fecEmi: fecha,
      horEmi: hora,
      tipoMoneda: 'USD',
    },
    documentoRelacionado: documentoRelacionado ? [{
      tipoDocumento: documentoRelacionado.tipoDocumento,
      tipoGeneracion: 2, // 2 = Electronico
      numeroDocumento: documentoRelacionado.codigoGeneracion,
      fechaEmision: documentoRelacionado.fechaEmision,
    }] : null,
    emisor: {
      nit: emisor.nit,
      nrc: emisor.nrc,
      nombre: emisor.nombre,
      codActividad: emisor.codActividad,
      descActividad: emisor.descActividad,
      nombreComercial: emisor.nombreComercial,
      tipoEstablecimiento: emisor.tipoEstablecimiento,
      direccion: {
        departamento: emisor.direccion.departamento,
        municipio: emisor.direccion.municipio,
        complemento: emisor.direccion.complemento,
      },
      telefono: emisor.telefono,
      correo: emisor.correo,
      codEstableMH: null,
      codEstable: emisor.codEstablecimiento,
      codPuntoVentaMH: null,
      codPuntoVenta: emisor.codPuntoVenta,
    },
    receptor: construirReceptor(cliente, tipoDte),
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: itemsCalculados,
    resumen,
    extension: motivo ? { motivoContingencia: null, observaciones: motivo } : null,
    apendice: null,
  };

  return { documento, codigoGeneracion, numeroControl };
}

module.exports = { construirDocumentoDTE, calcularItem, calcularResumen };
