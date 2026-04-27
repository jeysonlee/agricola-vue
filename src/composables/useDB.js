import { useLocalDB } from './useLocalDB'
import { useSupabase } from './useSupabase'

const isNative = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

// En nativo (Android/iOS): SQLite local con sync manual.
// En web: Supabase directo, siempre online.
export function useDB() {
  return isNative() ? useLocalDB() : useSupabase()
}
