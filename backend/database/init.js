// database/init.js
// Inicializa la base de datos SQLite con el esquema completo del sistema DTE

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'dte.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Creando esquema de base de datos...');

db.exec(`
-- =========================================================
-- USUARIOS Y ROLES
-- =========================================================
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol_id INTEGER NOT NULL,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- =========================================================
-- CLIENTES (receptores de los DTE)
-- =========================================================
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_documento TEXT NOT NULL,        -- 36=NIT, 13=DUI, 37=Pasaporte, 03=Otro
  numero_documento TEXT NOT NULL,
  nrc TEXT,
  nombre TEXT NOT NULL,
  codigo_actividad TEXT,
  desc_actividad TEXT,
  departamento TEXT,
  municipio TEXT,
  complemento_direccion TEXT,
  telefono TEXT,
  correo TEXT,
  tipo_contribuyente TEXT DEFAULT 'consumidor', -- consumidor | contribuyente
  password_hash TEXT,               -- credencial de acceso al Portal del Cliente
  portal_activo INTEGER DEFAULT 0,  -- 1 si el cliente puede iniciar sesion en su portal
  creado_en TEXT DEFAULT (datetime('now')),
  UNIQUE(tipo_documento, numero_documento)
);

-- =========================================================
-- PRODUCTOS / SERVICIOS
-- =========================================================
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  tipo_item INTEGER DEFAULT 1,   -- 1=Bien, 2=Servicio, 3=Ambos, 4=Impuesto
  precio_unitario REAL NOT NULL,
  gravado INTEGER DEFAULT 1,     -- 1 si aplica IVA 13%
  unidad_medida INTEGER DEFAULT 59, -- 59 = Unidad (catalogo MH)
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);

-- =========================================================
-- CORRELATIVOS por tipo de documento y establecimiento
-- =========================================================
CREATE TABLE IF NOT EXISTS correlativos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_dte TEXT NOT NULL,         -- 01=Factura, 03=CCF, 05=NotaCredito, 06=NotaDebito
  cod_establecimiento TEXT NOT NULL DEFAULT '0001',
  cod_punto_venta TEXT NOT NULL DEFAULT '0001',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  anio INTEGER NOT NULL,
  UNIQUE(tipo_dte, cod_establecimiento, cod_punto_venta, anio)
);

-- =========================================================
-- DOCUMENTOS TRIBUTARIOS ELECTRONICOS (DTE)
-- =========================================================
CREATE TABLE IF NOT EXISTS dtes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_generacion TEXT UNIQUE NOT NULL,   -- UUID v4 mayusculas
  numero_control TEXT UNIQUE NOT NULL,      -- DTE-01-0001-000000000000001
  sello_recepcion TEXT,                     -- devuelto por el MH
  tipo_dte TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  ambiente TEXT NOT NULL DEFAULT '00',      -- 00=Test, 01=Produccion
  cliente_id INTEGER,
  usuario_id INTEGER NOT NULL,
  fecha_emision TEXT NOT NULL,
  hora_emision TEXT NOT NULL,
  monto_total REAL NOT NULL,
  monto_iva REAL DEFAULT 0,
  monto_gravado REAL DEFAULT 0,
  monto_exento REAL DEFAULT 0,
  condicion_operacion INTEGER DEFAULT 1,    -- 1=Contado, 2=Credito, 3=Otro
  estado TEXT DEFAULT 'PENDIENTE',          -- PENDIENTE | PROCESADO | RECHAZADO | CONTINGENCIA | ANULADO
  documento_relacionado_id INTEGER,         -- FK logica al DTE original (para Notas de Credito/Debito)
  documento_relacionado_codigo TEXT,        -- codigoGeneracion del documento original
  documento_relacionado_tipo TEXT,          -- tipo_dte del documento original
  documento_relacionado_fecha TEXT,         -- fecha_emision del documento original
  motivo TEXT,                              -- motivo de la Nota de Credito/Debito
  pagado INTEGER DEFAULT 0,                 -- 1 si ya se registro el pago
  fecha_pago TEXT,                          -- cuando se marco como pagado
  metodo_pago TEXT,                         -- 'simulado' | 'stripe'
  stripe_session_id TEXT,                   -- id de la sesion de Stripe Checkout
  json_documento TEXT NOT NULL,             -- JSON completo firmado
  respuesta_mh TEXT,                        -- respuesta cruda del MH
  observaciones TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS dte_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dte_id INTEGER NOT NULL,
  producto_id INTEGER,
  numero_item INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  monto_descuento REAL DEFAULT 0,
  ventas_gravadas REAL DEFAULT 0,
  ventas_exentas REAL DEFAULT 0,
  FOREIGN KEY (dte_id) REFERENCES dtes(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Log de eventos/auditoria de transmision al MH
CREATE TABLE IF NOT EXISTS dte_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dte_id INTEGER NOT NULL,
  evento TEXT NOT NULL,       -- GENERADO | FIRMADO | ENVIADO | ACEPTADO | RECHAZADO | CONTINGENCIA | ANULADO
  detalle TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dte_id) REFERENCES dtes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dtes_fecha ON dtes(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_dtes_estado ON dtes(estado);
CREATE INDEX IF NOT EXISTS idx_dtes_cliente ON dtes(cliente_id);

-- =========================================================
-- SOLICITUDES DEL CLIENTE (correcciones o pedir factura nueva)
-- =========================================================
CREATE TABLE IF NOT EXISTS solicitudes_cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,               -- 'correccion' | 'nueva_factura'
  dte_id INTEGER,                   -- solo para tipo 'correccion'
  mensaje TEXT NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE',  -- PENDIENTE | ATENDIDA | RECHAZADA
  respuesta_admin TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  atendido_en TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (dte_id) REFERENCES dtes(id)
);
`);

// Seed de roles
const insertRol = db.prepare('INSERT OR IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)');
insertRol.run('admin', 'Administrador del sistema, acceso total');
insertRol.run('facturador', 'Puede emitir y anular DTE');
insertRol.run('contador', 'Solo lectura y reportes');
insertRol.run('superadmin', 'Super administrador, acceso total al sistema');

// Seed de usuario admin por defecto (password: Admin123!)
const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@miempresa.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  const rolAdmin = db.prepare('SELECT id FROM roles WHERE nombre = ?').get('admin');
  db.prepare(`
    INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
    VALUES (?, ?, ?, ?)
  `).run('Administrador', 'admin@miempresa.com', hash, rolAdmin.id);
  console.log('✅ Usuario admin creado -> email: admin@miempresa.com / password: Admin123!');
}
// Corrige el rol del superadmin si el usuario ya existia desde antes
const rolSuperAdminFix = db.prepare('SELECT id FROM roles WHERE nombre = ?').get('superadmin');
db.prepare('UPDATE usuarios SET rol_id = ? WHERE email = ?').run(rolSuperAdminFix.id, 'adminsmartvoice@gmail.com');

// Seed de usuario superadministrador (password: Emely2026$)
const superAdminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('adminsmartvoice@gmail.com');
if (!superAdminExists) {
  const hashSuperAdmin = bcrypt.hashSync('Emely2026$', 10);
    const rolSuperAdmin = db.prepare('SELECT id FROM roles WHERE nombre = ?').get('superadmin');
  db.prepare(`
    INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
    VALUES (?, ?, ?, ?)
    `).run('Superadministrador', 'adminsmartvoice@gmail.com', hashSuperAdmin, rolSuperAdmin.id);
  console.log('✅ Usuario superadmin creado -> email: adminsmartvoice@gmail.com / password: Emely2026$');
}


console.log('Base de datos inicializada correctamente en:', dbPath);
db.close();
