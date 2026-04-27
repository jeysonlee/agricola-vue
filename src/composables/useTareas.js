import { useDB } from './useDB'

const TABLE = 'tareas'

export function useTareas() {
  const { create, readAll, getById, update, remove, query } = useDB()

  const getAll = () => readAll(TABLE, 'created_at', false)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)
  const porParcela = (parcela_id) => query(TABLE, '*', { parcela_id }, { column: 'created_at', ascending: false })
  const porEstado = (estado) => query(TABLE, '*', { estado }, { column: 'created_at', ascending: false })

  return { getAll, getOne, crear, editar, eliminar, porParcela, porEstado }
}
