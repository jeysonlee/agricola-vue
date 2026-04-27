import { useDB } from './useDB'

const TABLE = 'parcela_users'

export function useParcelaUsers() {
  const { create, remove, query } = useDB()

  const porParcela = (parcela_id) => query(TABLE, '*', { parcela_id })
  const porUsuario = (user_id)   => query(TABLE, '*', { user_id })
  const crear      = (data)      => create(TABLE, data)
  const eliminar   = (id)        => remove(TABLE, id)

  async function eliminarPorParcela(parcela_id) {
    const rows = await porParcela(parcela_id)
    for (const r of rows) await eliminar(r.id)
  }

  return { porParcela, porUsuario, crear, eliminar, eliminarPorParcela }
}
