import { Network } from '@capacitor/network'

/**
 * Devuelve true si hay conexión. Usa @capacitor/network en nativo,
 * navigator.onLine como fallback en web.
 */
export async function checkOnline() {
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return navigator.onLine
  }
}

/**
 * Lanza un error si no hay conexión.
 * Usar al inicio de cualquier función que necesite el servidor.
 */
export async function requireOnline() {
  const online = await checkOnline()
  if (!online) throw new Error('Sin conexión a internet. Verifica tu red e inténtalo de nuevo.')
}
