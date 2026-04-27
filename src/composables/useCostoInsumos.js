import { useDB } from './useDB'

const TABLE = 'costo_insumos'

export function useCostoInsumos() {
  const { create, getById, update, remove, query } = useDB()

  const porTarea = (tarea_id) => query(TABLE, '*', { tarea_id })
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)

  async function eliminarPorTarea(tarea_id) {
    const rows = await porTarea(tarea_id)
    for (const r of rows) await eliminar(r.id)
  }

  return { porTarea, crear, editar, eliminar, eliminarPorTarea }
}
