import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const SUPABASE_URL      = 'https://gjiieglzvjolrlbkowlf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaWllZ2x6dmpvbHJsYmtvd2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTU1MTQsImV4cCI6MjA4NDY3MTUxNH0.G9iyHRL-hO3tsfj5el6xBPDgMOur-_ahY8tf68j5vLc'

// En nativo (Android/iOS) usa Capacitor Preferences.
// En web usa localStorage directamente — evita el prefijo "CapacitorStorage."
// que Capacitor añade y que rompe la búsqueda de sesión de Supabase al refrescar.
const isNative = () => typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

const storage = {
  async getItem(key) {
    if (isNative()) {
      const { value } = await Preferences.get({ key })
      return value
    }
    return localStorage.getItem(key)
  },
  async setItem(key, value) {
    if (isNative()) {
      await Preferences.set({ key, value })
    } else {
      localStorage.setItem(key, value)
    }
  },
  async removeItem(key) {
    if (isNative()) {
      await Preferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
})
