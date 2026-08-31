// src/utils/numeroALetras.js
// Convierte un monto en dólares (numero) a su representacion en letras,
// en el formato que exige el esquema JSON del Ministerio de Hacienda
// para el campo "totalLetras" del resumen de un DTE:
//
//   "<ENTERO EN LETRAS MAYUSCULAS> <CENTAVOS>/100 DOLARES"
//
// Ejemplos:
//   11.30  -> "ONCE 30/100 DOLARES"
//   100    -> "CIEN 00/100 DOLARES"
//   1250.5 -> "MIL DOSCIENTOS CINCUENTA 50/100 DOLARES"
//
// Soporta montos hasta 999,999,999.99 (mas que suficiente para facturacion).

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE',
];

const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA',
  'OCHENTA', 'NOVENTA',
];

const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirGrupo(n) {
  // n entre 0 y 999
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let resultado = '';

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  if (centena > 0) {
    resultado += CENTENAS[centena];
  }

  if (resto > 0) {
    if (resultado) resultado += ' ';

    if (resto < 20) {
      resultado += UNIDADES[resto];
    } else if (resto < 30) {
      resultado += resto === 20 ? 'VEINTE' : `VEINTI${UNIDADES[resto - 20]}`;
    } else {
      const decena = Math.floor(resto / 10);
      const unidad = resto % 10;
      resultado += DECENAS[decena];
      if (unidad > 0) {
        resultado += ` Y ${UNIDADES[unidad]}`;
      }
    }
  }

  return resultado;
}

// Apocope: "UNO"/"VEINTIUNO"/"TREINTA Y UNO" -> "UN"/"VEINTIUN"/"TREINTA Y UN"
// cuando preceden a un sustantivo (MIL, MILLON, MILLONES).
function apocoparUno(texto) {
  return texto.replace(/UNO$/, 'UN');
}

/**
 * Convierte la parte entera de un numero (0 a 999,999,999) a letras en español.
 */
function enteroALetras(entero) {
  if (entero === 0) return 'CERO';

  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const cientos = entero % 1000;

  const partes = [];

  if (millones > 0) {
    if (millones === 1) {
      partes.push('UN MILLON');
    } else {
      partes.push(`${apocoparUno(convertirGrupo(millones))} MILLONES`);
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      partes.push('MIL');
    } else {
      partes.push(`${apocoparUno(convertirGrupo(miles))} MIL`);
    }
  }

  if (cientos > 0) {
    partes.push(convertirGrupo(cientos));
  }

  return partes.join(' ');
}

/**
 * Convierte un monto en dolares a su representacion en letras para el
 * campo "totalLetras" del resumen del DTE.
 *
 * @param {number} monto - monto total (ej. 11.3)
 * @returns {string} ej. "ONCE 30/100 DOLARES"
 */
function numeroALetras(monto) {
  const valor = Number(monto) || 0;

  // Redondeamos a centavos para evitar arrastrar errores de punto flotante
  const totalCentavos = Math.round(valor * 100);
  const entero = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  const centavosTexto = String(centavos).padStart(2, '0');

  return `${enteroALetras(entero)} ${centavosTexto}/100 DOLARES`;
}

module.exports = { numeroALetras };
