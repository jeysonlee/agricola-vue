import { useDB } from './useDB'

const TABLE = 'venta_cosecha_detalle'

export function useVentaDetalle() {
  const { create, getById, update, remove, query } = useDB()

  const porVenta = (venta_id) => query(TABLE, '*', { venta_id })
  const porCosecha = (cosecha_id) => query(TABLE, '*', { cosecha_id })
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

  return { porVenta, porCosecha, crear, editar, eliminar }
}
