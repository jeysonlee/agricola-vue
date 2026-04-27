-- Tipos de tarea predeterminados (igual que project1)
INSERT INTO tipos_tarea (id, nombre, descripcion, created_at, updated_at, deleted_at, is_synced, synced_at)
VALUES
  (gen_random_uuid()::text, 'Poda de formación',       NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Poda sanitaria',           NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Deshierbo/limpieza',       NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Fertilización',            NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Cosecha',                  NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Fermentación y secado',    NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Injertación',              NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Control fitosanitario',    NULL, now()::text, now()::text, NULL, 1, now()::text),
  (gen_random_uuid()::text, 'Otra tarea',               NULL, now()::text, now()::text, NULL, 1, now()::text)
ON CONFLICT DO NOTHING;
