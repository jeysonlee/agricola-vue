import { useDB } from './useDB'

const TABLE = 'cosechas'

export function useCosechas() {
  const { create, readAll, getById, update, remove, query } = useDB()

  const getAll = () => readAll(TABLE, 'fecha_cosecha', false)
  const getOne = (id) => getById(TABLE, id)
  const crear = (data) => create(TABLE, data)
  const editar = (id, changes) => update(TABLE, id, changes)
  const eliminar = (id) => remove(TABLE, id)
  const porParcela = (parcela_id) => query(TABLE, '*', { parcela_id }, { column: 'fecha_cosecha', ascending: false })
  const porTarea = (tarea_id) => query(TABLE, '*', { tarea_id })

  async function getAllByParcelas(ids) {
    const all = await getAll()
    if (ids === null) return all
    if (!ids.length) return []
    return all.filter(c => ids.includes(c.parcela_id))
  }

  async function disponibles() {
    const all = await getAll()
    return all.filter(c => (+(c.kg_bruto_disponible ?? 0)) > 0 || (+(c.kg_seco_disponible ?? 0)) > 0)
  }

  async function disponiblesByParcelas(ids) {
    const all = await getAllByParcelas(ids)
    return all.filter(c => (+(c.kg_bruto_disponible ?? 0)) > 0 || (+(c.kg_seco_disponible ?? 0)) > 0)
  }

  function calcularEstado(cosecha) {
    const brutoDisp  = +(cosecha.kg_bruto_disponible ?? cosecha.kg_bruto ?? 0)
    const secoDisp   = +(cosecha.kg_seco_disponible  ?? cosecha.kg_seco  ?? 0)
    const brutoTotal = +(cosecha.kg_bruto ?? 0)
    const secoTotal  = +(cosecha.kg_seco  ?? 0)
    if (brutoTotal <= 0 && secoTotal <= 0) return 'COSECHADO'
    if (brutoDisp <= 0 && secoDisp <= 0) return 'VENDIDO'
    if (brutoDisp < brutoTotal || secoDisp < secoTotal) return 'PARCIAL'
    return 'COSECHADO'
  }

  async function actualizarDisponibles(cosechaId, kgBrutoVendido, kgSecoVendido, forceZero = false) {
    const cosecha = await getOne(cosechaId)
    if (!cosecha) throw new Error('Cosecha no encontrada')
    const nuevoBrutoDisp = forceZero ? 0 : Math.max(0, (+(cosecha.kg_bruto_disponible ?? cosecha.kg_bruto ?? 0)) - (+kgBrutoVendido))
    const nuevoSecoDisp  = forceZero ? 0 : Math.max(0, (+(cosecha.kg_seco_disponible  ?? cosecha.kg_seco  ?? 0)) - (+kgSecoVendido))
    const nuevoEstado    = calcularEstado({ ...cosecha, kg_bruto_disponible: nuevoBrutoDisp, kg_seco_disponible: nuevoSecoDisp })
    return editar(cosechaId, {
      kg_bruto_disponible: nuevoBrutoDisp,
      kg_seco_disponible:  nuevoSecoDisp,
      estado:              nuevoEstado,
    })
  }

  async function revertirDisponibles(cosechaId, kgBrutoVendido, kgSecoVendido) {
    const cosecha = await getOne(cosechaId)
    if (!cosecha) return
    const nuevoBrutoDisp = Math.min(+(cosecha.kg_bruto ?? 0), (+(cosecha.kg_bruto_disponible ?? 0)) + (+kgBrutoVendido))
    const nuevoSecoDisp  = Math.min(+(cosecha.kg_seco  ?? 0), (+(cosecha.kg_seco_disponible  ?? 0)) + (+kgSecoVendido))
    const nuevoEstado    = calcularEstado({ ...cosecha, kg_bruto_disponible: nuevoBrutoDisp, kg_seco_disponible: nuevoSecoDisp })
    return editar(cosechaId, {
      kg_bruto_disponible: nuevoBrutoDisp,
      kg_seco_disponible:  nuevoSecoDisp,
      estado:              nuevoEstado,
    })
  }

  return { getAll, getOne, crear, editar, eliminar, porParcela, porTarea, getAllByParcelas, disponibles, disponiblesByParcelas, calcularEstado, actualizarDisponibles, revertirDisponibles }
}
