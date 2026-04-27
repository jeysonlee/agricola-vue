import { useDB } from './useDB'
import { useParcelaUsers } from './useParcelaUsers'

const TABLE = 'parcelas'

export function useParcelas() {
  const { create, readAll, getById, update, remove, query } = useDB()

  const getAll = () => readAll(TABLE, 'nombre', true)
  const getOne = (id) => getById(TABLE, id)
  const editar = (id, changes) => update(TABLE, id, changes)
  const buscar = (filters) => query(TABLE, '*', filters, { column: 'nombre', ascending: true })

  // Parcelas asignadas a un usuario específico (vía parcela_users)
  async function getAllPorUsuario(userId) {
    const { porUsuario } = useParcelaUsers()
    const asignaciones = await porUsuario(userId)
    if (!asignaciones.length) return []
    const ids   = new Set(asignaciones.map(a => a.parcela_id))
    const todas = await getAll()
    return todas.filter(p => ids.has(p.id))
  }

  // Crea parcela y la asigna al usuario en parcela_users
  async function crearConUsuario(parcelaData, userId, rol = 'productor') {
    const { crear: crearAsignacion } = useParcelaUsers()
    const res = await create(TABLE, parcelaData)
    await crearAsignacion({ parcela_id: res.id, user_id: userId, rol })
    return res
  }

  // Elimina parcela y sus asignaciones
  async function eliminar(id) {
    const { eliminarPorParcela } = useParcelaUsers()
    await eliminarPorParcela(id)
    return remove(TABLE, id)
  }

  return { getAll, getOne, getAllPorUsuario, crearConUsuario, editar, eliminar, buscar }
}
