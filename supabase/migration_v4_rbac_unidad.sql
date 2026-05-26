-- ================================================================
-- MIGRACIÓN V4 — RBAC + Unidad de medida en insumos
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. NUEVA COLUMNA: unidad de medida en costo_insumos
--    (agregada en la app para: unidad, kg, g, litro, ml, galon...)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE costo_insumos
  ADD COLUMN IF NOT EXISTS unidad TEXT NOT NULL DEFAULT 'unidad';


-- ════════════════════════════════════════════════════════════════
-- 2. VERIFICAR estructura de la tabla users
--    (debe tener: id, auth_id, email, role, first_name, last_name, phone, status)
--    Si falta alguna columna, ejecuta solo el ALTER correspondiente.
-- ════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role        TEXT NOT NULL DEFAULT 'productor';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'activo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username    TEXT;


-- ════════════════════════════════════════════════════════════════
-- 3. VERIFICAR que parcela_users existe (ya debe existir)
--    Si la tabla no existe, créala con esto:
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS parcela_users (
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

CREATE INDEX IF NOT EXISTS idx_pu_parcela ON parcela_users(parcela_id);
CREATE INDEX IF NOT EXISTS idx_pu_user    ON parcela_users(user_id);

-- RLS para parcela_users (si no tiene políticas aún)
ALTER TABLE parcela_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parcela_users' AND policyname = 'auth_select_parcela_users'
  ) THEN
    CREATE POLICY "auth_select_parcela_users" ON parcela_users FOR SELECT TO authenticated USING (true);
    CREATE POLICY "auth_insert_parcela_users" ON parcela_users FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "auth_update_parcela_users" ON parcela_users FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "auth_delete_parcela_users" ON parcela_users FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════
-- 4. CONSULTAS DE DIAGNÓSTICO
--    Corre estas para ver el estado actual de tus datos
-- ════════════════════════════════════════════════════════════════

-- Ver todos los usuarios y sus roles:
SELECT id, email, role, first_name, last_name, status
FROM users
WHERE deleted_at IS NULL
ORDER BY role, email;

-- Ver todas las parcelas:
SELECT id, nombre, cultivo, area
FROM parcelas
WHERE deleted_at IS NULL
ORDER BY nombre;

-- Ver asignaciones actuales (puede estar vacío):
SELECT
  pu.id,
  u.email,
  u.role,
  p.nombre AS parcela,
  pu.rol   AS rol_en_parcela
FROM parcela_users pu
JOIN users    u ON u.id = pu.user_id
JOIN parcelas p ON p.id = pu.parcela_id
WHERE pu.deleted_at IS NULL
ORDER BY u.email, p.nombre;


-- ════════════════════════════════════════════════════════════════
-- 5. ASIGNAR PARCELAS A USUARIOS (edita con tus datos reales)
--
--    INSTRUCCIONES:
--    1. Corre las consultas del paso 4 para obtener los IDs
--    2. Reemplaza los UUIDs de ejemplo con los reales
--    3. Ejecuta cada INSERT para el usuario que corresponda
--
--    NOTA: admin/superadmin NO necesitan estar en parcela_users,
--          ven todo automáticamente.
-- ════════════════════════════════════════════════════════════════

/*
-- Ejemplo para un PRODUCTOR (solo ve sus propias parcelas):
INSERT INTO parcela_users (id, parcela_id, user_id, rol, created_at, updated_at, is_synced, synced_at)
VALUES (
  gen_random_uuid()::text,
  'UUID_DE_LA_PARCELA_AQUI',   -- copia el id de tu parcela
  'UUID_DEL_USUARIO_AQUI',     -- copia el id del usuario
  'productor',
  now()::text, now()::text, 1, now()::text
)
ON CONFLICT (parcela_id, user_id) DO NOTHING;

-- Ejemplo para un TÉCNICO (asignado a varias parcelas):
INSERT INTO parcela_users (id, parcela_id, user_id, rol, created_at, updated_at, is_synced, synced_at)
VALUES (
  gen_random_uuid()::text,
  'UUID_DE_LA_PARCELA_AQUI',
  'UUID_DEL_TECNICO_AQUI',
  'tecnico',
  now()::text, now()::text, 1, now()::text
)
ON CONFLICT (parcela_id, user_id) DO NOTHING;
*/


-- ════════════════════════════════════════════════════════════════
-- 6. VERIFICACIÓN FINAL
-- ════════════════════════════════════════════════════════════════

-- Confirmar que la columna unidad existe en costo_insumos:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'costo_insumos'
ORDER BY ordinal_position;
