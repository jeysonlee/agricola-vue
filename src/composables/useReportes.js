import { supabase } from '../config/supabase'
import { useAcceso } from './useAcceso'

export function useReportes() {
  const { getParcelasAccesibles } = useAcceso()

  async function getReportePorParcelas() {
    const parcelas = await getParcelasAccesibles()
    if (!parcelas.length) return []

    const parcelaIds = parcelas.map(p => p.id)

    // Ingresos desde venta_cosecha_detalle agrupado por parcela
    // Tareas finalizadas para calcular egresos reales
    const [detRes, tarRes] = await Promise.all([
      supabase
        .from('venta_cosecha_detalle')
        .select('parcela_id, subtotal, cantidad_vendida_kg')
        .in('parcela_id', parcelaIds)
        .is('deleted_at', null),
      supabase
        .from('tareas')
        .select('id, parcela_id')
        .in('parcela_id', parcelaIds)
        .eq('estado', 'finalizada')
        .is('deleted_at', null),
    ])

    const detalles  = detRes.data  || []
    const tareasFin = tarRes.data  || []
    const tareaIds  = tareasFin.map(t => t.id)

    let allCosts = []
    if (tareaIds.length) {
      const [obrs, herrs, ins] = await Promise.all([
        supabase.from('costo_obreros').select('tarea_id, subtotal').in('tarea_id', tareaIds).is('deleted_at', null),
        supabase.from('costo_herramientas').select('tarea_id, subtotal').in('tarea_id', tareaIds).is('deleted_at', null),
        supabase.from('costo_insumos').select('tarea_id, subtotal').in('tarea_id', tareaIds).is('deleted_at', null),
      ])
      allCosts = [...(obrs.data || []), ...(herrs.data || []), ...(ins.data || [])]
    }

    // mapa tarea_id → parcela_id para distribuir costos
    const tareaParcela = {}
    tareasFin.forEach(t => (tareaParcela[t.id] = t.parcela_id))

    // inicializar mapa de reporte por parcela
    const map = {}
    parcelas.forEach(p => {
      map[p.id] = {
        parcela_id:         p.id,
        nombre:             p.nombre,
        cultivo:            p.cultivo || '—',
        area:               p.area || 0,
        ingresos:           0,
        kg_vendidos:        0,
        egresos:            0,
        tareas_finalizadas: 0,
      }
    })

    detalles.forEach(d => {
      if (map[d.parcela_id]) {
        map[d.parcela_id].ingresos    += (+d.subtotal           || 0)
        map[d.parcela_id].kg_vendidos += (+d.cantidad_vendida_kg || 0)
      }
    })

    allCosts.forEach(c => {
      const pid = tareaParcela[c.tarea_id]
      if (pid && map[pid]) map[pid].egresos += (+c.subtotal || 0)
    })

    tareasFin.forEach(t => {
      if (map[t.parcela_id]) map[t.parcela_id].tareas_finalizadas++
    })

    return Object.values(map).map(r => ({
      ...r,
      utilidad: r.ingresos - r.egresos,
    }))
  }

  return { getReportePorParcelas }
}
