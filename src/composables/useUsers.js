import { useSupabase } from './useSupabase'
import { supabase } from '../config/supabase'
import { supabaseAdmin } from '../config/supabaseAdmin'

const TABLE = 'users'

export function useUsers() {
  // users siempre va a Supabase — gestión de auth, no offline
  const { create, getById, update, remove } = useSupabase()

  async function getAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  }

  const getOne = (id) => getById(TABLE, id)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

  // Construye el nombre para mostrar a partir de las columnas reales
  function displayName(user) {
    if (!user) return ''
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ')
    return full || user.username || user.email || ''
  }

  async function crear(userData) {
    // 1. Crear cuenta en auth.users
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    })
    if (error) throw error

    // 2. Insertar perfil en public.users con las columnas reales de la tabla
    const username = userData.username || userData.email.split('@')[0]
    const profile = {
      username,
      first_name: userData.first_name || userData.name || '',
      last_name:  userData.last_name  || '',
      email:      userData.email,
      phone:      userData.phone || null,
      role:       userData.role  || 'user',
      status:     'activo',
      auth_id:    data.user?.id || null,
    }
    return create(TABLE, profile)
  }

  async function cambiarPassword(authId, nuevaPassword) {
    if (!supabaseAdmin) throw new Error('Service key no configurada en .env.local')
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, { password: nuevaPassword })
    if (error) throw new Error(error.message)
  }

  return { getAll, getOne, crear, editar, eliminar, displayName, cambiarPassword }
}
