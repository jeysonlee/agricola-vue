-- ============================================================
-- MIGRACIÓN V3 — COSECHAS Y VENTAS (basada en project1)
-- Agrega el flujo completo: cosecha → venta parcial/total
-- Incluye: disponibles en cosecha, cabecera de venta,
--          detalle por cosecha vendida, reportes por parcela
-- NO toca: users, projects, beneficiaries
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. COSECHAS — agregar campos de disponibilidad
--    Estos dos campos son la clave para ventas parciales:
--    se inician = kg_bruto/kg_seco y se descuentan con cada venta
-- ════════════════════════════════════════════════════════════

ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_bruto_disponible  NUMERIC DEFAULT 0;
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS kg_seco_disponible   NUMERIC DEFAULT 0;

-- Sincronizar disponibles para registros existentes
-- (asume que no hay ventas aún; si las hay, ajustar manualmente)
UPDATE cosechas
SET
  kg_bruto_disponible = COALESCE(kg_bruto, 0),
  kg_seco_disponible  = COALESCE(kg_seco,  0)
WHERE kg_bruto_disponible = 0 AND kg_seco_disponible = 0;

-- Estado de la cosecha: auto-calculado según disponibles vs total
-- COSECHADO = nada vendido | PARCIAL = algo vendido | VENDIDO = todo vendido
ALTER TABLE cosechas DROP CONSTRAINT IF EXISTS cosechas_estado_check;
ALTER TABLE cosechas ADD CONSTRAINT cosechas_estado_check
  CHECK (estado IN ('COSECHADO', 'PARCIAL', 'VENDIDO'));


-- ════════════════════════════════════════════════════════════
-- 2. VENTAS — rediseño completo
--    La tabla actual (parcela_id, fecha, cantidad, precio_unidad)
--    no soporta vender múltiples cosechas ni el flujo FRESCO/SECO.
--    Se renombra la vieja y se crea la nueva.
-- ════════════════════════════════════════════════════════════

-- Guardar datos anteriores si los hay (por seguridad)
ALTER TABLE ventas RENAME TO ventas_legacy;

-- Nueva tabla ventas (cabecera de venta)
CREATE TABLE ventas (
  id                    TEXT PRIMARY KEY,

  -- Identificación
  nr_venta              TEXT,                         -- código generado: ddMMyyyyHHmmss
  fecha_venta           TEXT NOT NULL,

  -- Actores
  usuario_id            TEXT REFERENCES users(id),    -- quién registró la venta
  comprador             TEXT,
  vendedor              TEXT,
  lugar_venta           TEXT,

  -- Tipo de venta
  estado_humedad        TEXT NOT NULL DEFAULT 'SECO'
    CHECK (estado_humedad IN ('SECO', 'FRESCO')),

  -- Kilajes (los aproximados vienen de sumar las cosechas; los finales los da el comprador)
  kg_bruto_aproximados  NUMERIC DEFAULT 0,            -- suma de kg_bruto de las cosechas
  kg_seco_aproximados   NUMERIC DEFAULT 0,            -- suma de kg_seco de las cosechas
  kg_bruto              NUMERIC DEFAULT 0,            -- kg_bruto real del comprador
  kg_seco               NUMERIC DEFAULT 0,            -- kg_seco real (después de descuento si FRESCO)

  -- Descuento humedad (solo aplica si estado_humedad = 'FRESCO')
  desc_humedad          NUMERIC DEFAULT 0,            -- porcentaje de descuento por humedad

  -- Totales
  cantidad_vendida_kg   NUMERIC DEFAULT 0,            -- = kg_seco final
  precio_kg             NUMERIC NOT NULL DEFAULT 0,
  total_venta           NUMERIC DEFAULT 0,            -- cantidad_vendida_kg × precio_kg

  -- Auditoría
  observaciones         TEXT,
  created_at            TEXT,
  updated_at            TEXT,
  deleted_at            TEXT,
  is_synced             INTEGER DEFAULT 0,
  synced_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario  ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha    ON ventas(fecha_venta);


-- ════════════════════════════════════════════════════════════
-- 3. VENTA_COSECHA_DETALLE — tabla pivot (líneas de la venta)
--    Una venta puede incluir N cosechas.
--    Una cosecha puede aparecer en N ventas (ventas parciales).
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS venta_cosecha_detalle (
  id                    TEXT PRIMARY KEY,

  venta_id              TEXT NOT NULL REFERENCES ventas(id)   ON DELETE CASCADE,
  cosecha_id            TEXT NOT NULL REFERENCES cosechas(id) ON DELETE RESTRICT,
  parcela_id            TEXT REFERENCES parcelas(id),         -- desnormalizado para reportes rápidos

  -- Cuánto se vendió DE ESTA COSECHA en esta venta
  kg_bruto              NUMERIC DEFAULT 0,                    -- kg bruto de esta cosecha vendidos
  kg_seco               NUMERIC DEFAULT 0,                    -- kg seco de esta cosecha vendidos

  -- Snapshot del disponible AL MOMENTO de la venta (para auditoría y reversa)
  kg_bruto_disponible   NUMERIC DEFAULT 0,
  kg_seco_disponible    NUMERIC DEFAULT 0,

  -- Distribución proporcional dentro de la venta
  porcentaje_total_venta NUMERIC DEFAULT 0,                   -- % que representa esta cosecha del total
  cantidad_vendida_kg   NUMERIC DEFAULT 0,                    -- kg finales asignados a esta cosecha
  subtotal              NUMERIC DEFAULT 0,                    -- cantidad_vendida_kg × precio_kg

  -- Auditoría
  created_at            TEXT,
  updated_at            TEXT,
  deleted_at            TEXT,
  is_synced             INTEGER DEFAULT 0,
  synced_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_vcd_venta    ON venta_cosecha_detalle(venta_id);
CREATE INDEX IF NOT EXISTS idx_vcd_cosecha  ON venta_cosecha_detalle(cosecha_id);
CREATE INDEX IF NOT EXISTS idx_vcd_parcela  ON venta_cosecha_detalle(parcela_id);


-- ════════════════════════════════════════════════════════════
-- 4. RLS — políticas para las nuevas tablas
-- ════════════════════════════════════════════════════════════

ALTER TABLE ventas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_cosecha_detalle ENABLE ROW LEVEL SECURITY;

-- ventas
CREATE POLICY "Auth read ventas"   ON ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert ventas" ON ventas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update ventas" ON ventas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete ventas" ON ventas FOR DELETE TO authenticated USING (true);

-- venta_cosecha_detalle
CREATE POLICY "Auth read vcd"   ON venta_cosecha_detalle FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert vcd" ON venta_cosecha_detalle FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update vcd" ON venta_cosecha_detalle FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete vcd" ON venta_cosecha_detalle FOR DELETE TO authenticated USING (true);


-- ════════════════════════════════════════════════════════════
-- 5. VISTAS DE REPORTES POR PARCELA
-- ════════════════════════════════════════════════════════════

-- ── Reporte: ingresos por parcela (desde ventas) ──
CREATE OR REPLACE VIEW reporte_ingresos_parcela AS
SELECT
  p.id                              AS parcela_id,
  p.nombre                          AS parcela,
  COUNT(DISTINCT v.id)              AS total_ventas,
  SUM(vcd.cantidad_vendida_kg)      AS kg_vendidos,
  SUM(vcd.subtotal)                 AS total_ingresos
FROM parcelas p
JOIN venta_cosecha_detalle vcd ON vcd.parcela_id = p.id
JOIN ventas v ON v.id = vcd.venta_id
WHERE v.deleted_at IS NULL
  AND vcd.deleted_at IS NULL
GROUP BY p.id, p.nombre;


-- ── Reporte: egresos por parcela (desde costos de tareas) ──
-- Requiere que estén creadas las tablas costo_obreros, costo_herramientas, costo_insumos
-- Por ahora usa el costo_total de tareas (resumen)
CREATE OR REPLACE VIEW reporte_egresos_parcela AS
SELECT
  p.id                              AS parcela_id,
  p.nombre                          AS parcela,
  COUNT(t.id)                       AS total_tareas,
  SUM(COALESCE(t.costo_total, 0))   AS total_egresos
FROM parcelas p
JOIN tareas t ON t.parcela_id = p.id
WHERE t.deleted_at IS NULL
  AND t.estado IN ('finalizada', 'completada')
GROUP BY p.id, p.nombre;


-- ── Reporte: resumen financiero por parcela ──
CREATE OR REPLACE VIEW reporte_financiero_parcela AS
SELECT
  p.id                                          AS parcela_id,
  p.nombre                                      AS parcela,
  COALESCE(ing.total_ingresos, 0)               AS ingresos,
  COALESCE(egr.total_egresos,  0)               AS egresos,
  COALESCE(ing.total_ingresos, 0)
    - COALESCE(egr.total_egresos, 0)            AS utilidad,
  COALESCE(ing.kg_vendidos, 0)                  AS kg_vendidos,
  COALESCE(egr.total_tareas, 0)                 AS tareas_ejecutadas
FROM parcelas p
LEFT JOIN reporte_ingresos_parcela ing ON ing.parcela_id = p.id
LEFT JOIN reporte_egresos_parcela  egr ON egr.parcela_id = p.id
WHERE p.deleted_at IS NULL;


-- ════════════════════════════════════════════════════════════
-- 6. VERIFICACIÓN
-- ════════════════════════════════════════════════════════════
/*
-- Ver estructura cosechas (deben aparecer kg_bruto_disponible, kg_seco_disponible)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cosechas'
ORDER BY ordinal_position;

-- Ver estructura ventas nueva
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ventas'
ORDER BY ordinal_position;

-- Probar reporte financiero
SELECT * FROM reporte_financiero_parcela;
*/
