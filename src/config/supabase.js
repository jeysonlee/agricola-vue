import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const SUPABASE_URL      = 'https://gjiieglzvjolrlbkowlf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_tiyP8wNKcj6dDxV2DJIzAw_gt5rODzX'

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
