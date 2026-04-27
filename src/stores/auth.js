import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../config/supabase'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(JSON.parse(localStorage.getItem('currentUser') || 'null'))
  const session = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const userRole        = computed(() => currentUser.value?.role || null)
  const isAdmin         = computed(() => {
    const role = currentUser.value?.role?.toLowerCase()
    return role === 'admin' || role === 'superadmin'
  })

  // Nombre para mostrar: first_name + last_name, o username, o email
  const displayName = computed(() => {
    const u = currentUser.value
    if (!u) return ''
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
    return full || u.username || u.email || ''
  })

  async function fetchOrCreateProfile(authUser) {
    // 1. Buscar por auth_id
    let { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (profile) return profile

    // 2. Buscar por email (el admin puede haberse creado sin auth_id)
    const { data: byEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle()

    if (byEmail) {
      // Vincular auth_id si faltaba
      if (!byEmail.auth_id) {
        await supabase.from('users').update({ auth_id: authUser.id }).eq('id', byEmail.id)
      }
      return { ...byEmail, auth_id: authUser.id }
    }

    // 3. No existe perfil — crearlo automáticamente (primer login)
    const { v4: uuidv4 } = await import('uuid')
    const now = new Date().toISOString()
    const newProfile = {
      id:         uuidv4(),
      auth_id:    authUser.id,
      username:   authUser.email,
      first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
      last_name:  authUser.user_metadata?.last_name  || '',
      email:      authUser.email,
      phone:      authUser.user_metadata?.phone || null,
      role:       authUser.user_metadata?.role  || 'admin',
      status:     'activo',
      is_synced:  1,
      synced_at:  now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    const { data: created, error } = await supabase.from('users').insert(newProfile).select().single()
    if (error) {
      console.warn('[Auth] No se pudo crear perfil en public.users:', error.message)
      return newProfile
    }
    return created
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      session.value = data.session

      const user = await fetchOrCreateProfile(data.user)
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      return user
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    currentUser.value = null
    session.value = null
    localStorage.removeItem('currentUser')
  }

  async function restoreSession() {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      session.value = data.session
      if (!currentUser.value) {
        const user = await fetchOrCreateProfile(data.session.user)
        currentUser.value = user
        localStorage.setItem('currentUser', JSON.stringify(user))
      }
    } else {
      currentUser.value = null
      localStorage.removeItem('currentUser')
    }
  }

  return { currentUser, session, loading, isAuthenticated, userRole, isAdmin, displayName, login, logout, restoreSession }
})
