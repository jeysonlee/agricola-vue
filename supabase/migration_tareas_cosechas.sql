-- =============================================
-- MIGRACIÓN: Tareas y Cosechas
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- ── TAREAS: campos de costos y sub-listas (JSON) ──
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tipo_tarea_nombre   TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_mano_obra     NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_insumos       NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_herramientas  NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_total         NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS mano_obra           TEXT;   -- JSON array
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS insumos_tarea       TEXT;   -- JSON array
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS herramientas_tarea  TEXT;   -- JSON array

-- ── TAREAS: campos de cosecha (cuando tipo = 'Cosecha') ──
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS pctj_merma    NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_baldes   NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_kg_fresco NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_kg_secado NUMERIC;

-- ── COSECHAS: nuevos campos del schema project1 ──
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS tarea_id      TEXT;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS fecha_cosecha TEXT;  -- YYYY-MM-DD
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS pctj_merma    NUMERIC DEFAULT 60;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS cant_baldes   NUMERIC;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_bruto      NUMERIC;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_seco       NUMERIC;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS estado        TEXT DEFAULT 'COSECHADO';
