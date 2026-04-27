-- ================================================================
-- SCHEMA AGRÍCOLA V2 — COMPLETO
-- Ejecutar en Supabase SQL Editor
-- IMPORTANTE: Elimina el modelo anterior y crea el nuevo.
-- NO toca: users, projects, beneficiaries (lathing-app)
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. ELIMINAR MODELO ANTERIOR (orden inverso a FK)
-- ════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS venta_cosecha_detalle  CASCADE;
DROP TABLE IF EXISTS ventas_legacy          CASCADE;
DROP TABLE IF EXISTS ventas                 CASCADE;
DROP TABLE IF EXISTS cosechas               CASCADE;
DROP TABLE IF EXISTS costo_insumos          CASCADE;
DROP TABLE IF EXISTS costo_herramientas     CASCADE;
DROP TABLE IF EXISTS costo_obreros          CASCADE;
DROP TABLE IF EXISTS tareas                 CASCADE;
DROP TABLE IF EXISTS insumo_movimientos     CASCADE;
DROP TABLE IF EXISTS insumos                CASCADE;
DROP TABLE IF EXISTS herramientas           CASCADE;
DROP TABLE IF EXISTS tipos_tarea            CASCADE;
DROP TABLE IF EXISTS obreros                CASCADE;
DROP TABLE IF EXISTS parcela_users          CASCADE;
DROP TABLE IF EXISTS parcelas               CASCADE;

DROP VIEW IF EXISTS reporte_ingresos_parcela;
DROP VIEW IF EXISTS reporte_egresos_parcela;
DROP VIEW IF EXISTS reporte_financiero_parcela;


-- ════════════════════════════════════════════════════════════════
-- 2. PARCELAS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE parcelas (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  ubicacion   TEXT,
  area        NUMERIC,
  cultivo     TEXT,
  descripcion TEXT,
  created_at  TEXT,
  updated_at  TEXT,
  deleted_at  TEXT,
  is_synced   INTEGER DEFAULT 0,
  synced_at   TEXT
);


-- ════════════════════════════════════════════════════════════════
-- 3. PARCELA_USERS  (usuario ↔ parcela con rol)
--    productor = dueño, tecnico = asignado por admin
-- ════════════════════════════════════════════════════════════════
CREATE TABLE parcela_users (
  id          TEXT PRIMARY KEY,
  parcela_id  TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  rol         TEXT NOT NULL DEFAULT 'productor'
              CHECK (rol IN ('productor','tecnico')),
  created_at  TEXT,
  updated_at  TEXT,
  deleted_at  TEXT,
  is_synced   INTEGER DEFAULT 0,
  synced_at   TEXT,
  UNIQUE (parcela_id, user_id)
);
CREATE INDEX idx_pu_parcela ON parcela_users(parcela_id);
CREATE INDEX idx_pu_user    ON parcela_users(user_id);


-- ════════════════════════════════════════════════════════════════
-- 4. OBREROS  (maestro de trabajadores)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE obreros (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  dni         TEXT,
  cargo       TEXT,
  telefono    TEXT,
  direccion   TEXT,
  salario     NUMERIC,
  foto        TEXT,
  created_at  TEXT,
  updated_at  TEXT,
  deleted_at  TEXT,
  is_synced   INTEGER DEFAULT 0,
  synced_at   TEXT
);


-- ════════════════════════════════════════════════════════════════
-- 5. TAREAS  (actividades agrícolas)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE tareas (
  id                TEXT PRIMARY KEY,
  parcela_id        TEXT REFERENCES parcelas(id),
  tipo_tarea        TEXT NOT NULL,
  descripcion       TEXT,
  estado            TEXT NOT NULL DEFAULT 'programada'
                    CHECK (estado IN ('programada','en_ejecucion','finalizada','cancelada')),
  fecha_programada  TEXT,
  fecha_inicio      TEXT,
  fecha_fin         TEXT,
  costo_total       NUMERIC DEFAULT 0,
  observaciones     TEXT,
  created_at        TEXT,
  updated_at        TEXT,
  deleted_at        TEXT,
  is_synced         INTEGER DEFAULT 0,
  synced_at         TEXT
);
CREATE INDEX idx_tareas_parcela ON tareas(parcela_id);
CREATE INDEX idx_tareas_estado  ON tareas(estado);


-- ════════════════════════════════════════════════════════════════
-- 6. COSTO_OBREROS  (detalle mano de obra por tarea)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE costo_obreros (
  id               TEXT PRIMARY KEY,
  tarea_id         TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  tipo_trabajo     TEXT,
  num_obreros      INTEGER DEFAULT 1,
  dias             NUMERIC DEFAULT 1,
  costo_por_obrero NUMERIC DEFAULT 0,
  subtotal         NUMERIC DEFAULT 0,
  observaciones    TEXT,
  created_at       TEXT,
  updated_at       TEXT,
  deleted_at       TEXT,
  is_synced        INTEGER DEFAULT 0,
  synced_at        TEXT
);
CREATE INDEX idx_co_tarea ON costo_obreros(tarea_id);


-- ════════════════════════════════════════════════════════════════
-- 7. COSTO_HERRAMIENTAS  (herramientas/maquinaria por tarea)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE costo_herramientas (
  id             TEXT PRIMARY KEY,
  tarea_id       TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  modalidad      TEXT DEFAULT 'alquilado'
                 CHECK (modalidad IN ('alquilado','comprado','propio')),
  cantidad       NUMERIC DEFAULT 1,
  costo_unitario NUMERIC DEFAULT 0,
  subtotal       NUMERIC DEFAULT 0,
  descripcion    TEXT,
  created_at     TEXT,
  updated_at     TEXT,
  deleted_at     TEXT,
  is_synced      INTEGER DEFAULT 0,
  synced_at      TEXT
);
CREATE INDEX idx_ch_tarea ON costo_herramientas(tarea_id);


-- ════════════════════════════════════════════════════════════════
-- 8. COSTO_INSUMOS  (insumos utilizados por tarea)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE costo_insumos (
  id             TEXT PRIMARY KEY,
  tarea_id       TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  tipo_insumo    TEXT DEFAULT 'otro'
                 CHECK (tipo_insumo IN ('insecticida','fungicida','foliar','abono','herbicida','otro')),
  nombre         TEXT NOT NULL,
  cantidad       NUMERIC DEFAULT 1,
  costo_unitario NUMERIC DEFAULT 0,
  subtotal       NUMERIC DEFAULT 0,
  descripcion    TEXT,
  created_at     TEXT,
  updated_at     TEXT,
  deleted_at     TEXT,
  is_synced      INTEGER DEFAULT 0,
  synced_at      TEXT
);
CREATE INDEX idx_ci_tarea ON costo_insumos(tarea_id);


-- ════════════════════════════════════════════════════════════════
-- 9. COSECHAS  (registro de producción por tarea-parcela)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE cosechas (
  id                   TEXT PRIMARY KEY,
  parcela_id           TEXT REFERENCES parcelas(id),
  tarea_id             TEXT REFERENCES tareas(id),
  fecha_cosecha        TEXT NOT NULL,
  cant_baldes          NUMERIC DEFAULT 0,
  pctj_merma           NUMERIC DEFAULT 60,
  kg_bruto             NUMERIC DEFAULT 0,
  kg_seco              NUMERIC DEFAULT 0,
  kg_bruto_disponible  NUMERIC DEFAULT 0,
  kg_seco_disponible   NUMERIC DEFAULT 0,
  estado               TEXT NOT NULL DEFAULT 'COSECHADO'
                       CHECK (estado IN ('COSECHADO','PARCIAL','VENDIDO')),
  observaciones        TEXT,
  created_at           TEXT,
  updated_at           TEXT,
  deleted_at           TEXT,
  is_synced            INTEGER DEFAULT 0,
  synced_at            TEXT
);
CREATE INDEX idx_cosechas_parcela ON cosechas(parcela_id);
CREATE INDEX idx_cosechas_tarea   ON cosechas(tarea_id);
CREATE INDEX idx_cosechas_estado  ON cosechas(estado);


-- ════════════════════════════════════════════════════════════════
-- 10. VENTAS  (cabecera de venta)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE ventas (
  id                    TEXT PRIMARY KEY,
  nr_venta              TEXT,
  fecha_venta           TEXT NOT NULL,
  usuario_id            TEXT REFERENCES users(id),
  comprador             TEXT,
  vendedor              TEXT,
  lugar_venta           TEXT,
  estado_humedad        TEXT NOT NULL DEFAULT 'SECO'
                        CHECK (estado_humedad IN ('SECO','FRESCO')),
  kg_bruto_aproximados  NUMERIC DEFAULT 0,
  kg_seco_aproximados   NUMERIC DEFAULT 0,
  kg_bruto              NUMERIC DEFAULT 0,
  kg_seco               NUMERIC DEFAULT 0,
  desc_humedad          NUMERIC DEFAULT 0,
  cantidad_vendida_kg   NUMERIC DEFAULT 0,
  precio_kg             NUMERIC DEFAULT 0,
  total_venta           NUMERIC DEFAULT 0,
  observaciones         TEXT,
  created_at            TEXT,
  updated_at            TEXT,
  deleted_at            TEXT,
  is_synced             INTEGER DEFAULT 0,
  synced_at             TEXT
);
CREATE INDEX idx_ventas_fecha   ON ventas(fecha_venta);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);


-- ════════════════════════════════════════════════════════════════
-- 11. VENTA_COSECHA_DETALLE  (líneas: qué cosechas se vendieron)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE venta_cosecha_detalle (
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
  created_at             TEXT,
  updated_at             TEXT,
  deleted_at             TEXT,
  is_synced              INTEGER DEFAULT 0,
  synced_at              TEXT
);
CREATE INDEX idx_vcd_venta   ON venta_cosecha_detalle(venta_id);
CREATE INDEX idx_vcd_cosecha ON venta_cosecha_detalle(cosecha_id);
CREATE INDEX idx_vcd_parcela ON venta_cosecha_detalle(parcela_id);


-- ════════════════════════════════════════════════════════════════
-- 12. RLS  (Row Level Security)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE parcelas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcela_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE obreros               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE costo_obreros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE costo_herramientas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE costo_insumos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosechas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_cosecha_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas: autenticado puede leer/escribir todo
-- (el control fino se hace en la app con Laravel Policies o middleware)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'parcelas','parcela_users','obreros','tareas',
    'costo_obreros','costo_herramientas','costo_insumos',
    'cosechas','ventas','venta_cosecha_detalle'
  ] LOOP
    EXECUTE format('CREATE POLICY "auth_select_%s" ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════
-- 13. VISTAS DE REPORTES
-- ════════════════════════════════════════════════════════════════

-- Ingresos por parcela (ventas)
CREATE OR REPLACE VIEW reporte_ingresos_parcela AS
SELECT
  p.id                         AS parcela_id,
  p.nombre                     AS parcela,
  COUNT(DISTINCT v.id)         AS total_ventas,
  SUM(d.cantidad_vendida_kg)   AS kg_vendidos,
  SUM(d.subtotal)              AS total_ingresos
FROM parcelas p
JOIN venta_cosecha_detalle d ON d.parcela_id = p.id
JOIN ventas v                ON v.id = d.venta_id
WHERE v.deleted_at IS NULL
  AND d.deleted_at IS NULL
  AND p.deleted_at IS NULL
GROUP BY p.id, p.nombre;

-- Egresos por parcela (costos de tareas finalizadas)
CREATE OR REPLACE VIEW reporte_egresos_parcela AS
SELECT
  p.id                             AS parcela_id,
  p.nombre                         AS parcela,
  COUNT(t.id)                      AS total_tareas,
  SUM(COALESCE(o.sub, 0))          AS costo_obreros,
  SUM(COALESCE(h.sub, 0))          AS costo_herramientas,
  SUM(COALESCE(i.sub, 0))          AS costo_insumos,
  SUM(COALESCE(o.sub,0) + COALESCE(h.sub,0) + COALESCE(i.sub,0)) AS total_egresos
FROM parcelas p
JOIN tareas t ON t.parcela_id = p.id AND t.deleted_at IS NULL
LEFT JOIN (SELECT tarea_id, SUM(subtotal) sub FROM costo_obreros      WHERE deleted_at IS NULL GROUP BY tarea_id) o ON o.tarea_id = t.id
LEFT JOIN (SELECT tarea_id, SUM(subtotal) sub FROM costo_herramientas WHERE deleted_at IS NULL GROUP BY tarea_id) h ON h.tarea_id = t.id
LEFT JOIN (SELECT tarea_id, SUM(subtotal) sub FROM costo_insumos      WHERE deleted_at IS NULL GROUP BY tarea_id) i ON i.tarea_id = t.id
WHERE p.deleted_at IS NULL
  AND t.estado IN ('finalizada','completada')
GROUP BY p.id, p.nombre;

-- Resumen financiero por parcela
CREATE OR REPLACE VIEW reporte_financiero_parcela AS
SELECT
  p.id                                      AS parcela_id,
  p.nombre                                  AS parcela,
  p.cultivo,
  COALESCE(ing.total_ingresos, 0)           AS ingresos,
  COALESCE(egr.total_egresos,  0)           AS egresos,
  COALESCE(ing.total_ingresos, 0)
    - COALESCE(egr.total_egresos, 0)        AS utilidad,
  COALESCE(ing.kg_vendidos,    0)           AS kg_vendidos,
  COALESCE(egr.total_tareas,   0)           AS tareas_ejecutadas
FROM parcelas p
LEFT JOIN reporte_ingresos_parcela ing ON ing.parcela_id = p.id
LEFT JOIN reporte_egresos_parcela  egr ON egr.parcela_id = p.id
WHERE p.deleted_at IS NULL;
