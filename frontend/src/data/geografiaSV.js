// src/data/geografiaSV.js
// Catalogo de los 14 departamentos y los 44 municipios vigentes de El Salvador
// desde la Ley Especial para la Reestructuracion Municipal (vigente desde el
// 1 de mayo de 2024). Los codigos son un enumerado secuencial propio de este
// sistema (01-14 para departamentos, 01-44 para municipios), agrupados por
// departamento en el mismo orden usado tradicionalmente por el MH.

export const DEPARTAMENTOS = [
  { codigo: '01', nombre: 'Ahuachapan' },
  { codigo: '02', nombre: 'Santa Ana' },
  { codigo: '03', nombre: 'Sonsonate' },
  { codigo: '04', nombre: 'Chalatenango' },
  { codigo: '05', nombre: 'La Libertad' },
  { codigo: '06', nombre: 'San Salvador' },
  { codigo: '07', nombre: 'Cuscatlan' },
  { codigo: '08', nombre: 'La Paz' },
  { codigo: '09', nombre: 'Cabanas' },
  { codigo: '10', nombre: 'San Vicente' },
  { codigo: '11', nombre: 'Usulutan' },
  { codigo: '12', nombre: 'San Miguel' },
  { codigo: '13', nombre: 'Morazan' },
  { codigo: '14', nombre: 'La Union' },
];

// Los 44 municipios vigentes (cada uno agrupa varios "distritos", que eran
// los antiguos 262 municipios). depCodigo enlaza con DEPARTAMENTOS.codigo.
export const MUNICIPIOS = [
  // Ahuachapan (01)
  { codigo: '01', nombre: 'Ahuachapan Norte', depCodigo: '01' },
  { codigo: '02', nombre: 'Ahuachapan Centro', depCodigo: '01' },
  { codigo: '03', nombre: 'Ahuachapan Sur', depCodigo: '01' },
  // Santa Ana (02)
  { codigo: '04', nombre: 'Santa Ana Centro', depCodigo: '02' },
  { codigo: '05', nombre: 'Santa Ana Norte', depCodigo: '02' },
  { codigo: '06', nombre: 'Santa Ana Este', depCodigo: '02' },
  { codigo: '07', nombre: 'Santa Ana Oeste', depCodigo: '02' },
  // Sonsonate (03)
  { codigo: '08', nombre: 'Sonsonate Centro', depCodigo: '03' },
  { codigo: '09', nombre: 'Sonsonate Norte', depCodigo: '03' },
  { codigo: '10', nombre: 'Sonsonate Este', depCodigo: '03' },
  { codigo: '11', nombre: 'Sonsonate Oeste', depCodigo: '03' },
  // Chalatenango (04)
  { codigo: '12', nombre: 'Chalatenango Norte', depCodigo: '04' },
  { codigo: '13', nombre: 'Chalatenango Centro', depCodigo: '04' },
  { codigo: '14', nombre: 'Chalatenango Sur', depCodigo: '04' },
  // La Libertad (05)
  { codigo: '15', nombre: 'La Libertad Norte', depCodigo: '05' },
  { codigo: '16', nombre: 'La Libertad Centro', depCodigo: '05' },
  { codigo: '17', nombre: 'La Libertad Oeste', depCodigo: '05' },
  { codigo: '18', nombre: 'La Libertad Este', depCodigo: '05' },
  { codigo: '19', nombre: 'La Libertad Costa', depCodigo: '05' },
  { codigo: '20', nombre: 'La Libertad Sur', depCodigo: '05' },
  // San Salvador (06)
  { codigo: '21', nombre: 'San Salvador Norte', depCodigo: '06' },
  { codigo: '22', nombre: 'San Salvador Oeste', depCodigo: '06' },
  { codigo: '23', nombre: 'San Salvador Este', depCodigo: '06' },
  { codigo: '24', nombre: 'San Salvador Centro', depCodigo: '06' },
  { codigo: '25', nombre: 'San Salvador Sur', depCodigo: '06' },
  // Cuscatlan (07)
  { codigo: '26', nombre: 'Cuscatlan Norte', depCodigo: '07' },
  { codigo: '27', nombre: 'Cuscatlan Sur', depCodigo: '07' },
  // La Paz (08)
  { codigo: '28', nombre: 'La Paz Oeste', depCodigo: '08' },
  { codigo: '29', nombre: 'La Paz Centro', depCodigo: '08' },
  { codigo: '30', nombre: 'La Paz Este', depCodigo: '08' },
  // Cabanas (09)
  { codigo: '31', nombre: 'Cabanas Oeste', depCodigo: '09' },
  { codigo: '32', nombre: 'Cabanas Este', depCodigo: '09' },
  // San Vicente (10)
  { codigo: '33', nombre: 'San Vicente Norte', depCodigo: '10' },
  { codigo: '34', nombre: 'San Vicente Sur', depCodigo: '10' },
  // Usulutan (11)
  { codigo: '35', nombre: 'Usulutan Norte', depCodigo: '11' },
  { codigo: '36', nombre: 'Usulutan Este', depCodigo: '11' },
  { codigo: '37', nombre: 'Usulutan Oeste', depCodigo: '11' },
  // San Miguel (12)
  { codigo: '38', nombre: 'San Miguel Norte', depCodigo: '12' },
  { codigo: '39', nombre: 'San Miguel Centro', depCodigo: '12' },
  { codigo: '40', nombre: 'San Miguel Oeste', depCodigo: '12' },
  // Morazan (13)
  { codigo: '41', nombre: 'Morazan Norte', depCodigo: '13' },
  { codigo: '42', nombre: 'Morazan Sur', depCodigo: '13' },
  // La Union (14)
  { codigo: '43', nombre: 'La Union Norte', depCodigo: '14' },
  { codigo: '44', nombre: 'La Union Sur', depCodigo: '14' },
];

export function municipiosDeDepartamento(depCodigo) {
  return MUNICIPIOS.filter((m) => m.depCodigo === depCodigo);
}
