import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://gjiieglzvjolrlbkowlf.supabase.co'
const SERVICE_KEY   = import.meta.env.VITE_SUPABASE_SERVICE_KEY

// Cliente admin — solo disponible si VITE_SUPABASE_SERVICE_KEY está configurada en .env.local
// Permite cambiar contraseñas de otros usuarios sin requerir que el usuario esté logueado
export const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: 'sb-admin-auth-token' },
    })
  : null
