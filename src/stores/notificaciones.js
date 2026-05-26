import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const LS_LEIDAS   = 'notif_leidas_v1'
const LS_OVERDUE  = 'notif_overdue_date'

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const lista = ref([])

  const leidasSet = ref(new Set(
    JSON.parse(localStorage.getItem(LS_LEIDAS) || '[]')
  ))

  function setNotificaciones(nuevas) {
    lista.value = nuevas
    // Limpiar IDs leídos que ya no existen
    const ids = new Set(nuevas.map(n => n.id))
    for (const id of [...leidasSet.value]) {
      if (!ids.has(id)) leidasSet.value.delete(id)
    }
    _save()
  }

  const noLeidas = computed(() =>
    lista.value.filter(n => !leidasSet.value.has(n.id))
  )

  const unreadCount = computed(() => noLeidas.value.length)

  function marcarLeida(id) {
    leidasSet.value.add(id)
    _save()
  }

  function marcarTodasLeidas() {
    lista.value.forEach(n => leidasSet.value.add(n.id))
    _save()
  }

  function _save() {
    localStorage.setItem(LS_LEIDAS, JSON.stringify([...leidasSet.value]))
  }

  // Evita repetir notificación nativa de vencidas más de 1 vez por día
  function fueNotificadoHoyOverdue() {
    return localStorage.getItem(LS_OVERDUE) === new Date().toDateString()
  }

  function marcarNotificadoOverdue() {
    localStorage.setItem(LS_OVERDUE, new Date().toDateString())
  }

  return {
    lista, noLeidas, unreadCount,
    setNotificaciones, marcarLeida, marcarTodasLeidas,
    fueNotificadoHoyOverdue, marcarNotificadoOverdue,
  }
})
