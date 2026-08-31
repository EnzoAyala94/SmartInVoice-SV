// src/services/correlativoService.js
const db = require('../config/db');
const { emisor } = require('../config/emisor');

const NOMBRES_TIPO_DTE = {
  '01': 'Factura',
  '03': 'Comprobante de Credito Fiscal',
  '05': 'Nota de Credito',
  '06': 'Nota de Debito',
  '07': 'Comprobante de Retencion',
  '11': 'Factura de Exportacion',
  '14': 'Factura Sujeto Excluido',
};

/**
 * Obtiene el siguiente numero correlativo para un tipo de DTE dado,
 * y genera el numero de control con el formato oficial:
 * DTE-<tipo>-<codEstablecimiento><codPuntoVenta>-<correlativo 15 digitos>
 */
function generarNumeroControl(tipoDte) {
  const anio = new Date().getFullYear();
  const { codEstablecimiento, codPuntoVenta } = emisor;

  const existente = db.prepare(`
    SELECT * FROM correlativos
    WHERE tipo_dte = ? AND cod_establecimiento = ? AND cod_punto_venta = ? AND anio = ?
  `).get(tipoDte, codEstablecimiento, codPuntoVenta, anio);

  let nuevoNumero;

  const tx = db.transaction(() => {
    if (existente) {
      nuevoNumero = existente.ultimo_numero + 1;
      db.prepare(`UPDATE correlativos SET ultimo_numero = ? WHERE id = ?`)
        .run(nuevoNumero, existente.id);
    } else {
      nuevoNumero = 1;
      db.prepare(`
        INSERT INTO correlativos (tipo_dte, cod_establecimiento, cod_punto_venta, ultimo_numero, anio)
        VALUES (?, ?, ?, ?, ?)
      `).run(tipoDte, codEstablecimiento, codPuntoVenta, nuevoNumero, anio);
    }
  });
  tx();

  const correlativoStr = String(nuevoNumero).padStart(15, '0');
  const numeroControl = `DTE-${tipoDte}-${codEstablecimiento}${codPuntoVenta}-${correlativoStr}`;

  return numeroControl;
}

module.exports = { generarNumeroControl, NOMBRES_TIPO_DTE };
