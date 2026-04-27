-- ================================================================
-- SCHEMA AGRÍCOLA V2
-- Referencia canónica del modelo de datos
-- Ver schema_v2_complete.sql para el script de migración completo
-- ================================================================

-- PARCELAS
CREATE TABLE IF NOT EXISTS parcelas (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  ubicacion   TEXT,
  area        NUMERIC,
  cultivo     TEXT,
  descripcion TEXT,
  created_at  TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced   INTEGER DEFAULT 0, synced_at TEXT
);

-- PARCELA_USERS (productor dueño / técnico asignado)
CREATE TABLE IF NOT EXISTS parcela_users (
  id         TEXT PRIMARY KEY,
  parcela_id TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  rol        TEXT NOT NULL DEFAULT 'productor' CHECK (rol IN ('productor','tecnico')),
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT,
  UNIQUE (parcela_id, user_id)
);

-- OBREROS (maestro de trabajadores)
CREATE TABLE IF NOT EXISTS obreros (
  id         TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  dni        TEXT, cargo TEXT, telefono TEXT, direccion TEXT,
  salario    NUMERIC, foto TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- TAREAS
CREATE TABLE IF NOT EXISTS tareas (
  id               TEXT PRIMARY KEY,
  parcela_id       TEXT REFERENCES parcelas(id),
  tipo_tarea       TEXT NOT NULL,
  descripcion      TEXT,
  estado           TEXT NOT NULL DEFAULT 'programada'
                   CHECK (estado IN ('programada','en_ejecucion','finalizada','cancelada')),
  fecha_programada TEXT,
  fecha_inicio     TEXT,
  fecha_fin        TEXT,
  costo_total      NUMERIC DEFAULT 0,
  observaciones    TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- COSTO_OBREROS
CREATE TABLE IF NOT EXISTS costo_obreros (
  id               TEXT PRIMARY KEY,
  tarea_id         TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  tipo_trabajo     TEXT,
  num_obreros      INTEGER DEFAULT 1,
  dias             NUMERIC DEFAULT 1,
  costo_por_obrero NUMERIC DEFAULT 0,
  subtotal         NUMERIC DEFAULT 0,
  observaciones    TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- COSTO_HERRAMIENTAS
CREATE TABLE IF NOT EXISTS costo_herramientas (
  id             TEXT PRIMARY KEY,
  tarea_id       TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  modalidad      TEXT DEFAULT 'alquilado' CHECK (modalidad IN ('alquilado','comprado','propio')),
  cantidad       NUMERIC DEFAULT 1,
  costo_unitario NUMERIC DEFAULT 0,
  subtotal       NUMERIC DEFAULT 0,
  descripcion    TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- COSTO_INSUMOS
CREATE TABLE IF NOT EXISTS costo_insumos (
  id             TEXT PRIMARY KEY,
  tarea_id       TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  tipo_insumo    TEXT DEFAULT 'otro'
                 CHECK (tipo_insumo IN ('insecticida','fungicida','foliar','abono','herbicida','otro')),
  nombre         TEXT NOT NULL,
  cantidad       NUMERIC DEFAULT 1,
  costo_unitario NUMERIC DEFAULT 0,
  subtotal       NUMERIC DEFAULT 0,
  descripcion    TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- COSECHAS
CREATE TABLE IF NOT EXISTS cosechas (
  id                  TEXT PRIMARY KEY,
  parcela_id          TEXT REFERENCES parcelas(id),
  tarea_id            TEXT REFERENCES tareas(id),
  fecha_cosecha       TEXT NOT NULL,
  cant_baldes         NUMERIC DEFAULT 0,
  pctj_merma          NUMERIC DEFAULT 60,
  kg_bruto            NUMERIC DEFAULT 0,
  kg_seco             NUMERIC DEFAULT 0,
  kg_bruto_disponible NUMERIC DEFAULT 0,
  kg_seco_disponible  NUMERIC DEFAULT 0,
  estado              TEXT NOT NULL DEFAULT 'COSECHADO'
                      CHECK (estado IN ('COSECHADO','PARCIAL','VENDIDO')),
  observaciones TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- VENTAS (cabecera)
CREATE TABLE IF NOT EXISTS ventas (
  id                   TEXT PRIMARY KEY,
  nr_venta             TEXT,
  fecha_venta          TEXT NOT NULL,
  usuario_id           TEXT REFERENCES users(id),
  comprador            TEXT, vendedor TEXT, lugar_venta TEXT,
  estado_humedad       TEXT NOT NULL DEFAULT 'SECO' CHECK (estado_humedad IN ('SECO','FRESCO')),
  kg_bruto_aproximados NUMERIC DEFAULT 0,
  kg_seco_aproximados  NUMERIC DEFAULT 0,
  kg_bruto             NUMERIC DEFAULT 0,
  kg_seco              NUMERIC DEFAULT 0,
  desc_humedad         NUMERIC DEFAULT 0,
  cantidad_vendida_kg  NUMERIC DEFAULT 0,
  precio_kg            NUMERIC DEFAULT 0,
  total_venta          NUMERIC DEFAULT 0,
  observaciones TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);

-- VENTA_COSECHA_DETALLE (líneas de venta)
CREATE TABLE IF NOT EXISTS venta_cosecha_detalle (
  id                     TEXT PRIMARY KEY,
  venta_id               TEXT NOT NULL REFERENCES ventas(id)   ON DELETE CASCADE,
  cosecha_id             TEXT NOT NULL REFERENCES cosechas(id) ON DELETE RESTRICT,
  parcela_id             TEXT REFERENCES parcelas(id),
  kg_bruto               NUMERIC DEFAULT 0,
  kg_seco                NUMERIC DEFAULT 0,
  kg_bruto_disponible    NUMERIC DEFAULT 0,
  kg_seco_disponible     NUMERIC DEFAULT 0,
  porcentaje_total_venta NUMERIC DEFAULT 0,
  cantidad_vendida_kg    NUMERIC DEFAULT 0,
  subtotal               NUMERIC DEFAULT 0,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  is_synced  INTEGER DEFAULT 0, synced_at TEXT
);
