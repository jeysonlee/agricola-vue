import { useDB } from './useDB'

const TABLE = 'insumo_movimientos'

export function useMovimientos() {
  const { create, readAll, getById, update, remove, query } = useDB()

  const getAll = () => readAll(TABLE, 'created_at', false)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)
  const porInsumo = (insumo_id) => query(TABLE, '*', { insumo_id }, { column: 'created_at', ascending: false })

  return { getAll, getOne, crear, editar, eliminar, porInsumo }
}
