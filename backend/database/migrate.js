// database/migrate.js
// Aplica cambios de esquema a una base de datos ya existente, sin perder datos.
// Es seguro correrlo varias veces (verifica si la columna ya existe antes de agregarla).

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'dte.sqlite');
const db = new Database(dbPath);

function columnaExiste(tabla, columna) {
  const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all();
  return columnas.some((c) => c.name === columna);
}

console.log('Revisando migraciones pendientes...');

if (!columnaExiste('clientes', 'password_hash')) {
  db.exec(`ALTER TABLE clientes ADD COLUMN password_hash TEXT`);
  console.log('+ Agregada columna clientes.password_hash');
}

if (!columnaExiste('clientes', 'portal_activo')) {
  db.exec(`ALTER TABLE clientes ADD COLUMN portal_activo INTEGER DEFAULT 0`);
  console.log('+ Agregada columna clientes.portal_activo');
}

if (!columnaExiste('dtes', 'documento_relacionado_id')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN documento_relacionado_id INTEGER`);
  console.log('+ Agregada columna dtes.documento_relacionado_id');
}
if (!columnaExiste('dtes', 'documento_relacionado_codigo')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN documento_relacionado_codigo TEXT`);
  console.log('+ Agregada columna dtes.documento_relacionado_codigo');
}
if (!columnaExiste('dtes', 'documento_relacionado_tipo')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN documento_relacionado_tipo TEXT`);
  console.log('+ Agregada columna dtes.documento_relacionado_tipo');
}
if (!columnaExiste('dtes', 'documento_relacionado_fecha')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN documento_relacionado_fecha TEXT`);
  console.log('+ Agregada columna dtes.documento_relacionado_fecha');
}
if (!columnaExiste('dtes', 'motivo')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN motivo TEXT`);
  console.log('+ Agregada columna dtes.motivo');
}

const tablaSolicitudesExiste = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='solicitudes_cliente'
`).get();
if (!tablaSolicitudesExiste) {
  db.exec(`
    CREATE TABLE solicitudes_cliente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      dte_id INTEGER,
      mensaje TEXT NOT NULL,
      estado TEXT DEFAULT 'PENDIENTE',
      respuesta_admin TEXT,
      creado_en TEXT DEFAULT (datetime('now')),
      atendido_en TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (dte_id) REFERENCES dtes(id)
    )
  `);
  console.log('+ Creada tabla solicitudes_cliente');
}

if (!columnaExiste('dtes', 'pagado')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN pagado INTEGER DEFAULT 0`);
  console.log('+ Agregada columna dtes.pagado');
}
if (!columnaExiste('dtes', 'fecha_pago')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN fecha_pago TEXT`);
  console.log('+ Agregada columna dtes.fecha_pago');
}
if (!columnaExiste('dtes', 'metodo_pago')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN metodo_pago TEXT`);
  console.log('+ Agregada columna dtes.metodo_pago');
}
if (!columnaExiste('dtes', 'stripe_session_id')) {
  db.exec(`ALTER TABLE dtes ADD COLUMN stripe_session_id TEXT`);
  console.log('+ Agregada columna dtes.stripe_session_id');
}

// Asegura que exista el rol "contador" con permisos de emision (ya no es solo lectura)
const contador = db.prepare('SELECT id FROM roles WHERE nombre = ?').get('contador');
if (!contador) {
  db.prepare('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)')
    .run('contador', 'Puede emitir, anular y ver reportes');
  console.log('+ Rol "contador" creado');
}

console.log('Migracion completada. Base de datos al dia.');
db.close();
