import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../config/supabase'

const SESSION_HOURS = 12
const SESSION_MS    = SESSION_HOURS * 60 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(JSON.parse(localStorage.getItem('currentUser') || 'null'))
  const session     = ref(null)
  const loading     = ref(false)

  // Momento del último login exitoso (ms epoch). 0 = nunca.
  const loginAt = ref(Number(localStorage.getItem('loginAt') || 0))

  const isAuthenticated = computed(() => !!currentUser.value)
  const userRole        = computed(() => currentUser.value?.role || null)
  const isAdmin         = computed(() => {
    const role = currentUser.value?.role?.trim().toLowerCase()
    return role === 'admin' || role === 'superadmin'
  })

  // True cuando han pasado más de SESSION_HOURS desde el último login
  const sessionExpired = computed(() => {
    if (!loginAt.value || !currentUser.value) return false
    return Date.now() - loginAt.value > SESSION_MS
  })

  // Minutos restantes de sesión (negativo = ya expiró)
  const minutosRestantes = computed(() => {
    if (!loginAt.value) return 0
    return Math.round((SESSION_MS - (Date.now() - loginAt.value)) / 60_000)
  })

  const displayName = computed(() => {
    const u = currentUser.value
    if (!u) return ''
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
    return full || u.username || u.email || ''
  })

  async function fetchOrCreateProfile(authUser) {
    let { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (profile) return profile

    const { data: byEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle()

    if (byEmail) {
      if (!byEmail.auth_id) {
        await supabase.from('users').update({ auth_id: authUser.id }).eq('id', byEmail.id)
      }
      return { ...byEmail, auth_id: authUser.id }
    }

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
      console.warn('[Auth] No se pudo crear perfil:', error.message)
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

      // Registrar momento exacto del login para control de expiración
      loginAt.value = Date.now()
      localStorage.setItem('loginAt', String(loginAt.value))

      return user
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try { await supabase.auth.signOut() } catch (_) {}
    currentUser.value = null
    session.value     = null
    loginAt.value     = 0
    localStorage.removeItem('currentUser')
    localStorage.removeItem('loginAt')
  }

  // Llamar al arrancar la app. Devuelve false si la sesión expiró o no existe.
  async function restoreSession() {
    // Si la sesión expiró, cerrar automáticamente
    if (sessionExpired.value) {
      await logout()
      return false
    }

    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        session.value = data.session
        if (!currentUser.value) {
          const user = await fetchOrCreateProfile(data.session.user)
          currentUser.value = user
          localStorage.setItem('currentUser', JSON.stringify(user))
        }
      } else if (currentUser.value && loginAt.value) {
        // Sin sesión Supabase pero hay datos locales.
        // Solo permitir modo offline si realmente no hay red.
        // Con red: Supabase no reconoce la sesión (instalación limpia o token borrado) → forzar login.
        if (navigator.onLine) {
          await logout()
          return false
        }
      } else {
        // Sin nada: cerrar
        await logout()
        return false
      }
    } catch (_) {
      // Error de red: permitir modo offline si hay datos y la sesión no expiró
    }

    return true
  }

  return {
    currentUser, session, loading, loginAt,
    isAuthenticated, userRole, isAdmin, displayName,
    sessionExpired, minutosRestantes,
    login, logout, restoreSession,
    SESSION_HOURS,
  }
})
