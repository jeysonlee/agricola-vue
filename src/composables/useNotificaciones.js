import { LocalNotifications } from '@capacitor/local-notifications'

const isNative = () => typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

// Convierte un UUID a entero estable de 32 bits para ID de notificación
function uuidToInt(uuid, sufijo = 0) {
  let hash = sufijo * 1000
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 2_000_000_000
}

// ── Clasificación de urgencia ─────────────────────────────────────────────────
// Solo aplica a tareas con estado 'programada' y fecha_programada definida.
// Retorna: 'vencida' | 'hoy' | 'manana' | 'semana' | 'proxima' | null
export function urgenciaTarea(tarea) {
  if (tarea.estado !== 'programada' || !tarea.fecha_programada) return null

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fp = new Date(tarea.fecha_programada + 'T12:00:00')
  fp.setHours(0, 0, 0, 0)

  const dias = Math.round((fp - hoy) / 86_400_000)

  if (dias < 0)  return 'vencida'
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'manana'
  if (dias <= 7)  return 'semana'
  if (dias <= 14) return 'proxima'
  return null
}

export function urgenciaColor(nivel) {
  const map = { vencida: 'danger', hoy: 'danger', manana: 'warning', semana: 'warning', proxima: 'medium' }
  return map[nivel] || null
}

export function urgenciaLabel(nivel) {
  const map = { vencida: 'Vencida', hoy: 'Hoy', manana: 'Mañana', semana: 'Esta semana', proxima: 'Próx. semana' }
  return map[nivel] || ''
}

// Convierte tareas en objetos de notificación para el panel in-app
export function generarNotificacionesDeTareas(tareas, parcelaMap = {}) {
  const ORDEN = { vencida: 0, hoy: 1, manana: 2, semana: 3, proxima: 4 }
  return tareas
    .map(t => {
      const nivel = urgenciaTarea(t)
      if (!nivel) return null
      return {
        id:       t.id,
        tareaId:  t.id,
        urgencia: nivel,
        titulo:   t.tipo_tarea || 'Tarea',
        parcela:  parcelaMap[t.parcela_id] || '',
        fecha:    t.fecha_programada || '',
        color:    urgenciaColor(nivel),
        label:    urgenciaLabel(nivel),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (ORDEN[a.urgencia] ?? 9) - (ORDEN[b.urgencia] ?? 9))
}

// Agrupa un array de tareas según urgencia
export function clasificarTareas(tareas) {
  const grupos = { vencidas: [], hoy: [], manana: [], semana: [], proxima: [] }
  for (const t of tareas) {
    const nivel = urgenciaTarea(t)
    if (nivel === 'vencida') grupos.vencidas.push(t)
    else if (nivel === 'hoy')    grupos.hoy.push(t)
    else if (nivel === 'manana') grupos.manana.push(t)
    else if (nivel === 'semana') grupos.semana.push(t)
    else if (nivel === 'proxima') grupos.proxima.push(t)
  }
  return grupos
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useNotificaciones() {

  async function pedirPermiso() {
    if (!isNative()) return false
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }

  // Programa notificaciones 7AM y 8PM del día anterior a fecha_programada
  async function programarAlarmasTarea(tarea) {
    if (!tarea?.fecha_programada || !isNative()) return

    const permiso = await pedirPermiso()
    if (!permiso) return

    const id7am = uuidToInt(tarea.id, 1)
    const id8pm = uuidToInt(tarea.id, 2)

    try { await LocalNotifications.cancel({ notifications: [{ id: id7am }, { id: id8pm }] }) } catch (_) {}

    const diaPrevio = new Date(tarea.fecha_programada + 'T12:00:00')
    diaPrevio.setDate(diaPrevio.getDate() - 1)

    const at7am = new Date(diaPrevio); at7am.setHours(7, 0, 0, 0)
    const at8pm = new Date(diaPrevio); at8pm.setHours(20, 0, 0, 0)
    const ahora = new Date()

    const titulo = `Tarea: ${tarea.tipo_tarea || 'Agricola'} mañana`
    const cuerpo = tarea.descripcion
      ? `${tarea.descripcion} — ${tarea.fecha_programada}`
      : `Programada para mañana ${tarea.fecha_programada}`

    const notifs = []
    if (at7am > ahora) notifs.push({ id: id7am, title: titulo, body: cuerpo, schedule: { at: at7am }, smallIcon: 'ic_notification' })
    if (at8pm > ahora) notifs.push({ id: id8pm, title: titulo, body: cuerpo, schedule: { at: at8pm }, smallIcon: 'ic_notification' })

    if (notifs.length) await LocalNotifications.schedule({ notifications: notifs })
  }

  async function cancelarAlarmasTarea(tareaId) {
    if (!tareaId || !isNative()) return
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: uuidToInt(tareaId, 1) }, { id: uuidToInt(tareaId, 2) }],
      })
    } catch (_) {}
  }

  // Notificación nativa inmediata si hay tareas vencidas (1 vez por día)
  async function notificarOverdueNativo(grupos, store) {
    if (!isNative()) return
    if (store?.fueNotificadoHoyOverdue()) return

    const total = grupos.vencidas.length + grupos.hoy.length
    if (!total) return

    const permiso = await pedirPermiso()
    if (!permiso) return

    const partes = []
    if (grupos.vencidas.length) partes.push(`${grupos.vencidas.length} vencida${grupos.vencidas.length > 1 ? 's' : ''}`)
    if (grupos.hoy.length)      partes.push(`${grupos.hoy.length} para hoy`)

    await LocalNotifications.schedule({
      notifications: [{
        id:    999_999_001,
        title: 'Agrogest — Tareas urgentes',
        body:  partes.join(', '),
        schedule: { at: new Date(Date.now() + 2000) },
        smallIcon: 'ic_notification',
      }],
    })

    store?.marcarNotificadoOverdue()
  }

  // Re-programa todas las notificaciones al iniciar la app (por si el dispositivo reinició)
  async function sincronizarNotificaciones(tareas) {
    if (!isNative()) return
    const permiso = await pedirPermiso()
    if (!permiso) return

    for (const t of tareas) {
      if (t.estado === 'programada' && t.fecha_programada) {
        const nivel = urgenciaTarea(t)
        if (nivel && nivel !== 'vencida') {
          await programarAlarmasTarea(t)
        }
      }
    }
  }

  return { programarAlarmasTarea, cancelarAlarmasTarea, pedirPermiso, sincronizarNotificaciones, notificarOverdueNativo }
}
