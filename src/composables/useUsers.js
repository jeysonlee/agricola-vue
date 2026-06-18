import { useDB } from './useDB'
import { supabase } from '../config/supabase'
import { supabaseAdmin } from '../config/supabaseAdmin'

const TABLE = 'users'

export function useUsers() {
  const db = useDB()

  const getAll    = () => db.readAll(TABLE, 'created_at', false)
  const getOne    = (id) => db.getById(TABLE, id)
  const editar    = (id, changes) => db.update(TABLE, id, changes)
  const eliminar  = (id) => db.remove(TABLE, id)

  function displayName(user) {
    if (!user) return ''
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ')
    return full || user.username || user.email || ''
  }

  // Crear usuario siempre requiere red: crea auth + perfil en Supabase.
  // La próxima sincronización descargará el perfil a SQLite local.
  async function crear(userData) {
    const { data, error } = await supabase.auth.signUp({
      email:    userData.email,
      password: userData.password,
    })
    if (error) throw error

    const { create } = useDB()
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
