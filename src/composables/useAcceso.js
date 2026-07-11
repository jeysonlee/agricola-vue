import { useAuthStore } from '../stores/auth'
import { useParcelas } from './useParcelas'

export function useAcceso() {
  const auth = useAuthStore()

  // Returns null for admin/superadmin (all access), or an array of parcela_ids
  async function getParcelaIds() {
    const role = auth.currentUser?.role?.trim().toLowerCase()
    if (!role || role === 'admin' || role === 'superadmin') return null

    const { getAllPorUsuario } = useParcelas()
    const parcelas = await getAllPorUsuario(auth.currentUser.id)
    return parcelas.map(p => p.id)
  }

  // Returns all accessible parcelas (objects, not just ids)
  async function getParcelasAccesibles() {
    const role = auth.currentUser?.role?.trim().toLowerCase()
    if (!role || role === 'admin' || role === 'superadmin') {
      const { getAll } = useParcelas()
      return getAll()
    }
    const { getAllPorUsuario } = useParcelas()
    return getAllPorUsuario(auth.currentUser.id)
  }

  return { getParcelaIds, getParcelasAccesibles }
}
