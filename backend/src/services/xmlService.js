// src/services/xmlService.js
const { create } = require('xmlbuilder2');

/**
 * Genera la representacion XML de un DTE a partir de su JSON almacenado.
 * NOTA: el formato oficial de intercambio del MH es JSON firmado (JWT), no XML.
 * Este XML es una representacion adicional del mismo documento, pensada para
 * quienes necesiten importar el comprobante en sistemas contables que solo
 * aceptan XML (comun en otros paises / sistemas ERP).
 */
function generarXMLDte({ dte, documento }) {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('DocumentoTributarioElectronico');

  root.ele('Identificacion')
    .ele('TipoDte').txt(dte.tipo_dte).up()
    .ele('NumeroControl').txt(dte.numero_control).up()
    .ele('CodigoGeneracion').txt(dte.codigo_generacion).up()
    .ele('SelloRecepcion').txt(dte.sello_recepcion || '').up()
    .ele('FechaEmision').txt(dte.fecha_emision).up()
    .ele('HoraEmision').txt(dte.hora_emision).up()
    .ele('Estado').txt(dte.estado).up()
    .up();

  const emisorXml = root.ele('Emisor');
  Object.entries(documento.emisor || {}).forEach(([key, value]) => {
    if (value !== null && typeof value !== 'object') {
      emisorXml.ele(capitalizar(key)).txt(String(value)).up();
    }
  });
  emisorXml.up();

  const receptorXml = root.ele('Receptor');
  Object.entries(documento.receptor || {}).forEach(([key, value]) => {
    if (value !== null && typeof value !== 'object') {
      receptorXml.ele(capitalizar(key)).txt(String(value)).up();
    }
  });
  receptorXml.up();

  const itemsXml = root.ele('CuerpoDocumento');
  (documento.cuerpoDocumento || []).forEach((item) => {
    const itemXml = itemsXml.ele('Item');
    Object.entries(item).forEach(([key, value]) => {
      if (value !== null && typeof value !== 'object') {
        itemXml.ele(capitalizar(key)).txt(String(value)).up();
      }
    });
    itemXml.up();
  });
  itemsXml.up();

  const resumenXml = root.ele('Resumen');
  Object.entries(documento.resumen || {}).forEach(([key, value]) => {
    if (value !== null && typeof value !== 'object') {
      resumenXml.ele(capitalizar(key)).txt(String(value)).up();
    }
  });
  resumenXml.up();

  return root.end({ prettyPrint: true });
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

module.exports = { generarXMLDte };
