-- =============================================
-- STORAGE — Bucket para fotos de Agrícola
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Crear bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agricola',
  'agricola',
  true,
  10485760,  -- 10 MB máximo por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Lectura pública agricola"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'agricola');

CREATE POLICY "Upload autenticado agricola"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agricola');

CREATE POLICY "Update autenticado agricola"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agricola');

CREATE POLICY "Delete autenticado agricola"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agricola');
