import { useDB } from './useDB'
import { useVentaDetalle } from './useVentaDetalle'
import { useCosechas } from './useCosechas'

const TABLE = 'ventas'

export function useVentas() {
  const { create, readAll, getById, update, remove } = useDB()

  const getAll = () => readAll(TABLE, 'fecha_venta', false)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

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
      await crearDetalle({ ...d, venta_id: ventaId })
      await actualizarDisponibles(d.cosecha_id, d.kg_bruto || 0, d.kg_seco || 0)
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

  return { getAll, getOne, crear, editar, eliminar, crearConDetalles, eliminarConReversion, generarNrVenta }
}
