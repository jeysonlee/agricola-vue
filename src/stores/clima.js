import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Preferences } from '@capacitor/preferences'

const KEY     = 'clima_cache'
const TTL_MS  = 30 * 60 * 1000   // 30 min antes de considerar datos caducados

export const useClimaStore = defineStore('clima', () => {
  const datos     = ref(null)
  const lastFetch = ref(null)

  const caducado = computed(() => {
    if (!lastFetch.value) return true
    return Date.now() - lastFetch.value > TTL_MS
  })

  const minutosDesdeActualizacion = computed(() => {
    if (!lastFetch.value) return null
    const ms = Date.now() - lastFetch.value
    const min = Math.floor(ms / 60_000)
    const hs  = Math.floor(ms / 3_600_000)
    if (hs >= 24) return `hace ${Math.floor(hs / 24)}d`
    if (hs >= 1)  return `hace ${hs}h`
    if (min >= 1) return `hace ${min} min`
    return 'justo ahora'
  })

  async function guardar(payload) {
    datos.value     = payload
    lastFetch.value = Date.now()
    try {
      await Preferences.set({
        key:   KEY,
        value: JSON.stringify({ ...payload, savedAt: lastFetch.value }),
      })
    } catch (_) { /* no crítico */ }
  }

  async function cargarDesdeCache() {
    try {
      const { value } = await Preferences.get({ key: KEY })
      if (!value) return false
      const parsed = JSON.parse(value)
      if (!parsed?.actual) return false
      datos.value     = parsed
      lastFetch.value = parsed.savedAt ?? null
      return true
    } catch (_) {
      return false
    }
  }

  async function limpiar() {
    datos.value     = null
    lastFetch.value = null
    await Preferences.remove({ key: KEY }).catch(() => {})
  }

  return { datos, lastFetch, caducado, minutosDesdeActualizacion, guardar, cargarDesdeCache, limpiar }
})
