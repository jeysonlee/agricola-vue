-- ============================================================
-- MIGRACIÓN V2 — AGRICOLA
-- ¿Qué hace este script?
--   1. Elimina tablas que la app ya no usa
--   2. Deja tareas con exactamente las columnas que el formulario envía
--   3. Deja cosechas con las columnas que el formulario crea
--   4. Mantiene parcelas, obreros, ventas sin cambios
--   5. NO toca users / projects / beneficiaries del lathing-app
--
-- EJECUTAR UNA SOLA VEZ en Supabase SQL Editor
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. ELIMINAR TABLAS QUE YA NO TIENEN CÓDIGO EN LA APP
-- ════════════════════════════════════════════════════════════

-- CASCADE elimina también las FK que apuntan a estas tablas
DROP TABLE IF EXISTS insumo_movimientos CASCADE;
DROP TABLE IF EXISTS insumos            CASCADE;
DROP TABLE IF EXISTS herramientas       CASCADE;
DROP TABLE IF EXISTS tipos_tarea        CASCADE;


-- ════════════════════════════════════════════════════════════
-- 2. TABLA tareas — LIMPIAR COLUMNAS OBSOLETAS
-- ════════════════════════════════════════════════════════════

-- tipo_tarea_id era FK a tipos_tarea (tabla eliminada)
ALTER TABLE tareas DROP COLUMN IF EXISTS tipo_tarea_id;


-- ════════════════════════════════════════════════════════════
-- 3. TABLA tareas — AGREGAR COLUMNAS QUE EL FORM ENVÍA
-- ════════════════════════════════════════════════════════════

-- El form hace: const data = { ...form.value, tipo_tarea_nombre, costo_*, mano_obra, ... }
-- Cada columna aquí corresponde a un campo que llega en el INSERT / UPDATE

-- Tipo de tarea (select hardcodeado en el form, guardado como texto libre)
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tipo_tarea       TEXT;

-- El form también envía tipo_tarea_nombre = tipo_tarea (redundante, pero lo envía)
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tipo_tarea_nombre TEXT;

-- Costos resumen (totales calculados en el form)
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_mano_obra    NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_insumos      NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_herramientas NUMERIC DEFAULT 0;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_total        NUMERIC DEFAULT 0;

-- Detalle en JSON (arrays de objetos, solo para mostrar en pantalla)
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS mano_obra          TEXT;  -- JSON: [{actividad, num_obreros, jornadas, costo_jornal, subtotal}]
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS insumos_tarea      TEXT;  -- JSON: [{nombre, unidad, cantidad, precio_unitario, subtotal}]
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS herramientas_tarea TEXT;  -- JSON: [{nombre, tipo, horas_uso, costo_hora, subtotal}]

-- Datos cosecha (el form los envía via ...form.value cuando tipo_tarea = 'Cosecha')
-- Se guardan en tareas Y se copian a la tabla cosechas al mismo tiempo
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS pctj_merma      NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_baldes     NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_kg_fresco  NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cant_kg_secado  NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS estado_cosecha  TEXT;


-- ════════════════════════════════════════════════════════════
-- 4. TABLA cosechas — AGREGAR COLUMNAS DEL NUEVO FORMULARIO
-- ════════════════════════════════════════════════════════════

-- Enlace a la tarea origen (cuando se crea desde FormTareaPage)
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS tarea_id      TEXT REFERENCES tareas(id) ON DELETE SET NULL;

-- Fecha específica de cosecha (formato YYYY-MM-DD)
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS fecha_cosecha TEXT;

-- Datos de producción
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS pctj_merma  NUMERIC DEFAULT 60;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS cant_baldes NUMERIC;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_bruto    NUMERIC;  -- = cant_kg_fresco de la tarea
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_seco     NUMERIC;  -- = cant_kg_secado de la tarea

-- Estado del lote cosechado
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'COSECHADO'
  CHECK (estado IN ('COSECHADO', 'PARCIAL', 'VENDIDO'));


-- ════════════════════════════════════════════════════════════
-- 5. ÍNDICES
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_tareas_parcela    ON tareas(parcela_id);
CREATE INDEX IF NOT EXISTS idx_cosechas_parcela  ON cosechas(parcela_id);
CREATE INDEX IF NOT EXISTS idx_cosechas_tarea    ON cosechas(tarea_id);


-- ════════════════════════════════════════════════════════════
-- 6. RLS — las nuevas columnas heredan las políticas de tabla
--    (no se necesitan políticas nuevas, ya existen a nivel tabla)
-- ════════════════════════════════════════════════════════════

-- Solo aseguramos que las tablas que sobreviven siguen con RLS activo
ALTER TABLE parcelas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE obreros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosechas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas    ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- 7. VERIFICACIÓN FINAL
--    Copia y pega este SELECT para confirmar que quedó bien
-- ════════════════════════════════════════════════════════════

/*
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tareas'
ORDER BY ordinal_position;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cosechas'
ORDER BY ordinal_position;
*/
