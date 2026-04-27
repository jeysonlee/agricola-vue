import { useDB } from './useDB'

const TABLE = 'obreros'

export function useObreros() {
  const { create, readAll, getById, update, remove } = useDB()

  const getAll = () => readAll(TABLE, 'nombre', true)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

  return { getAll, getOne, crear, editar, eliminar }
}
