// database/initializeDb.js
// Módulo que garantiza que la BD esté inicializada cuando el servidor inicia

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'dte.sqlite');

function initializeDatabase() {
  // Si la BD ya existe y tiene tablas, no hacer nada
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all();
      db.close();
      
      if (tables.length > 0) {
        console.log('✅ Base de datos ya inicializada.');
        return;
      }
    } catch (e) {
      console.log('⚠️  BD corrupta, reinicializando...');
    }
  }

  console.log('🔧 Inicializando base de datos...');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Crear esquema
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
  tipo_documento TEXT NOT NULL,
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
  tipo_contribuyente TEXT DEFAULT 'consumidor',
  password_hash TEXT,
  portal_activo INTEGER DEFAULT 0,
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
  tipo_item INTEGER DEFAULT 1,
  precio_unitario REAL NOT NULL,
  gravado INTEGER DEFAULT 1,
  unidad_medida INTEGER DEFAULT 59,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);

-- =========================================================
-- CORRELATIVOS
-- =========================================================
CREATE TABLE IF NOT EXISTS correlativos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_dte TEXT NOT NULL,
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
  codigo_generacion TEXT UNIQUE NOT NULL,
  numero_control TEXT UNIQUE NOT NULL,
  sello_recepcion TEXT,
  tipo_dte TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  ambiente TEXT NOT NULL DEFAULT '00',
  cliente_id INTEGER,
  usuario_id INTEGER NOT NULL,
  fecha_emision TEXT NOT NULL,
  hora_emision TEXT NOT NULL,
  monto_total REAL NOT NULL,
  monto_iva REAL DEFAULT 0,
  monto_gravado REAL DEFAULT 0,
  monto_exento REAL DEFAULT 0,
  condicion_operacion INTEGER DEFAULT 1,
  estado TEXT DEFAULT 'PENDIENTE',
  documento_relacionado_id INTEGER,
  documento_relacionado_codigo TEXT,
  documento_relacionado_tipo TEXT,
  documento_relacionado_fecha TEXT,
  motivo TEXT,
  pagado INTEGER DEFAULT 0,
  fecha_pago TEXT,
  metodo_pago TEXT,
  stripe_session_id TEXT,
  json_documento TEXT NOT NULL,
  respuesta_mh TEXT,
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

CREATE TABLE IF NOT EXISTS dte_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dte_id INTEGER NOT NULL,
  evento TEXT NOT NULL,
  detalle TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dte_id) REFERENCES dtes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dtes_fecha ON dtes(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_dtes_estado ON dtes(estado);
CREATE INDEX IF NOT EXISTS idx_dtes_cliente ON dtes(cliente_id);

-- =========================================================
-- SOLICITUDES DEL CLIENTE
-- =========================================================
CREATE TABLE IF NOT EXISTS solicitudes_cliente (
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
);
  `);

  // Insertar roles
  const insertRol = db.prepare('INSERT OR IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)');
  insertRol.run('admin', 'Administrador del sistema, acceso total');
  insertRol.run('facturador', 'Puede emitir y anular DTE');
  insertRol.run('contador', 'Solo lectura y reportes');

  insertRol.run('superadmin', 'Super administrador, acceso total al sistema');
  // Insertar usuarios
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

  db.close();
  console.log('✅ Base de datos inicializada exitosamente en:', dbPath);
}

module.exports = { initializeDatabase };
