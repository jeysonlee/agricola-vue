import { useDB } from './useDB'
import { useAcceso } from './useAcceso'

export function useReportes() {
  const { getParcelasAccesibles } = useAcceso()

  async function getReportePorParcelas() {
    const parcelas = await getParcelasAccesibles()
    if (!parcelas.length) return []

    const parcelaIds = parcelas.map(p => p.id)
    const db = useDB()

    const [todosDetalles, todasTareas] = await Promise.all([
      db.queryIn('venta_cosecha_detalle', 'parcela_id', parcelaIds),
      db.queryIn('tareas',                'parcela_id', parcelaIds),
    ])

    const tareasFin = todasTareas.filter(t => t.estado === 'finalizada')
    const tareaIds  = tareasFin.map(t => t.id)

    let allCosts = []
    if (tareaIds.length) {
      const [obrs, herrs, ins] = await Promise.all([
        db.queryIn('costo_obreros',      'tarea_id', tareaIds),
        db.queryIn('costo_herramientas', 'tarea_id', tareaIds),
        db.queryIn('costo_insumos',      'tarea_id', tareaIds),
      ])
      allCosts = [...obrs, ...herrs, ...ins]
    }

    const map = {}
    parcelas.forEach(p => {
      map[p.id] = {
        parcela_id:         p.id,
        nombre:             p.nombre,
        cultivo:            p.cultivo || '—',
        area:               p.area    || 0,
        ingresos:           0,
        kg_vendidos:        0,
        egresos:            0,
        tareas_finalizadas: 0,
      }
    })

    todosDetalles.forEach(d => {
      if (map[d.parcela_id]) {
        map[d.parcela_id].ingresos    += (+d.subtotal            || 0)
        map[d.parcela_id].kg_vendidos += (+d.cantidad_vendida_kg || 0)
      }
    })

    const tareaParcela = {}
    tareasFin.forEach(t => (tareaParcela[t.id] = t.parcela_id))

    allCosts.forEach(c => {
      const pid = tareaParcela[c.tarea_id]
      if (pid && map[pid]) map[pid].egresos += (+c.subtotal || 0)
    })

    tareasFin.forEach(t => {
      if (map[t.parcela_id]) map[t.parcela_id].tareas_finalizadas++
    })

    return Object.values(map).map(r => ({ ...r, utilidad: r.ingresos - r.egresos }))
  }

  return { getReportePorParcelas }
}
