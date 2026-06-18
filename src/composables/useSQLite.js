import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

const DB_NAME    = 'agricola'
const DB_VERSION = 1

const sqlite = new SQLiteConnection(CapacitorSQLite)
let   db     = null
let   isWeb  = false

// Columnas de sincronización presentes en todas las tablas
const C = 'created_at TEXT, updated_at TEXT, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0, synced_at TEXT'

// DDL completo — CREATE TABLE IF NOT EXISTS es idempotente (seguro re-ejecutar)
const DDL = `
  CREATE TABLE IF NOT EXISTS parcelas (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    nombre TEXT, ubicacion TEXT, area REAL, cultivo TEXT, descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS parcela_users (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    parcela_id TEXT NOT NULL, user_id TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'productor'
  );

  CREATE TABLE IF NOT EXISTS tareas (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    tipo_tarea TEXT, parcela_id TEXT, descripcion TEXT,
    estado TEXT NOT NULL DEFAULT 'programada',
    fecha_programada TEXT, fecha_inicio TEXT, fecha_fin TEXT,
    observaciones TEXT, costo_total REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS costo_obreros (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    tarea_id TEXT, tipo_trabajo TEXT,
    num_obreros REAL DEFAULT 1, dias REAL DEFAULT 1,
    costo_por_obrero REAL DEFAULT 0, subtotal REAL DEFAULT 0,
    observaciones TEXT
  );

  CREATE TABLE IF NOT EXISTS costo_herramientas (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    tarea_id TEXT, nombre TEXT, modalidad TEXT,
    cantidad REAL DEFAULT 1, costo_unitario REAL DEFAULT 0, subtotal REAL DEFAULT 0,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS costo_insumos (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    tarea_id TEXT, tipo_insumo TEXT, nombre TEXT,
    unidad TEXT NOT NULL DEFAULT 'unidad',
    cantidad REAL DEFAULT 1, costo_unitario REAL DEFAULT 0, subtotal REAL DEFAULT 0,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS cosechas (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    parcela_id TEXT, tarea_id TEXT,
    fecha_cosecha TEXT,
    cant_baldes REAL, pctj_merma REAL DEFAULT 60,
    kg_bruto REAL, kg_seco REAL,
    kg_bruto_disponible REAL, kg_seco_disponible REAL,
    estado TEXT NOT NULL DEFAULT 'COSECHADO',
    observaciones TEXT
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    nr_venta TEXT, fecha_venta TEXT,
    usuario_id TEXT,
    comprador TEXT, vendedor TEXT, lugar_venta TEXT,
    estado_humedad TEXT DEFAULT 'SECO', desc_humedad REAL DEFAULT 0,
    kg_bruto_aproximados REAL DEFAULT 0, kg_seco_aproximados REAL DEFAULT 0,
    kg_bruto REAL DEFAULT 0, kg_seco REAL DEFAULT 0,
    cantidad_vendida_kg REAL DEFAULT 0,
    precio_kg REAL DEFAULT 0, total_venta REAL DEFAULT 0,
    observaciones TEXT
  );

  CREATE TABLE IF NOT EXISTS venta_cosecha_detalle (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    venta_id TEXT, cosecha_id TEXT, parcela_id TEXT,
    kg_bruto REAL DEFAULT 0, kg_seco REAL DEFAULT 0,
    kg_bruto_disponible REAL DEFAULT 0, kg_seco_disponible REAL DEFAULT 0,
    porcentaje_total_venta REAL DEFAULT 0,
    cantidad_vendida_kg REAL DEFAULT 0, subtotal REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL, ${C},
    auth_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'activo'
  );
`

// Columnas que pueden faltar en bases de datos ya instaladas (migración incremental)
const MIGRATIONS = [
  'ALTER TABLE costo_obreros      ADD COLUMN observaciones TEXT',
  'ALTER TABLE costo_herramientas ADD COLUMN descripcion   TEXT',
  'ALTER TABLE costo_insumos      ADD COLUMN descripcion   TEXT',
  'ALTER TABLE cosechas           ADD COLUMN observaciones TEXT',
  'ALTER TABLE ventas             ADD COLUMN usuario_id    TEXT',
]

export async function initSQLite() {
  if (db) return db

  const platform = Capacitor.getPlatform()
  isWeb = platform === 'web'

  if (isWeb) {
    await CapacitorSQLite.initWebStore()
  } else if (platform === 'android') {
    try {
      await CapacitorSQLite.requestPermissions()
    } catch (_) {}
  }

  const isConn = await sqlite.isConnection(DB_NAME, false)
  if (isConn.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false)
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
  }
  await db.open()

  await db.execute(DDL)

  // Migraciones incrementales: cada ALTER TABLE falla silenciosamente si la columna ya existe
  for (const sql of MIGRATIONS) {
    try { await db.run(sql) } catch (_) {}
  }

  return db
}

export function getSQLite() { return db }
export function getIsWeb()   { return isWeb }

export async function saveWebStore() {
  if (isWeb) await CapacitorSQLite.saveToStore({ database: DB_NAME })
}
