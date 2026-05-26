import { useDB } from './useDB'
import { useVentaDetalle } from './useVentaDetalle'
import { useCosechas } from './useCosechas'

const TABLE = 'ventas'

export function useVentas() {
  const { create, readAll, getById, update, remove, queryIn } = useDB()

  const getAll = () => readAll(TABLE, 'fecha_venta', false)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

  async function getAllByParcelas(ids) {
    if (ids === null) return getAll()
    if (!ids.length) return []

    const { getAllByParcelas: getCosechasByParcelas } = useCosechas()
    const cosechas = await getCosechasByParcelas(ids)
    if (!cosechas.length) return []

    const cosechaIds = cosechas.map(c => c.id)

    const detalles = await queryIn('venta_cosecha_detalle', 'cosecha_id', cosechaIds)
    if (!detalles.length) return []

    const ventaIds = new Set(detalles.map(d => d.venta_id))
    const allVentas = await getAll()
    return allVentas.filter(v => ventaIds.has(v.id))
  }

  // Genera número de venta: ddMMyyyyHHmmss
  function generarNrVenta() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}${pad(d.getMonth()+1)}${d.getFullYear()}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  }

  // Crea venta con sus detalles y actualiza disponibles en cosechas
  async function crearConDetalles({ ventaData, detalles }) {
    const { crear: crearDetalle } = useVentaDetalle()
    const { actualizarDisponibles } = useCosechas()

    const res = await crear({ ...ventaData, nr_venta: generarNrVenta() })
    const ventaId = res.id

    for (const d of detalles) {
      const { es_venta_total, ...detalleDB } = d
      await crearDetalle({ ...detalleDB, venta_id: ventaId })
      await actualizarDisponibles(d.cosecha_id, d.kg_bruto || 0, d.kg_seco || 0, es_venta_total || false)
    }

    return { id: ventaId }
  }

  // Elimina venta revirtiendo los disponibles de las cosechas
  async function eliminarConReversion(ventaId) {
    const { porVenta, eliminar: eliminarDetalle } = useVentaDetalle()
    const { revertirDisponibles } = useCosechas()

    const detalles = await porVenta(ventaId)
    for (const d of detalles) {
      await revertirDisponibles(d.cosecha_id, d.kg_bruto || 0, d.kg_seco || 0)
      await eliminarDetalle(d.id)
    }
    return eliminar(ventaId)
  }

  return { getAll, getOne, crear, editar, eliminar, getAllByParcelas, crearConDetalles, eliminarConReversion, generarNrVenta }
}
