import { Filesystem, Directory } from '@capacitor/filesystem'
import { supabase } from '../config/supabase'
import { useLocalDB } from './useLocalDB'
import { useStorage } from './useStorage'
import { useSyncStore } from '../stores/sync'

const TABLES = [
  'parcelas',
  'parcela_users',
  'tareas',
  'costo_obreros',
  'costo_herramientas',
  'costo_insumos',
  'cosechas',
  'ventas',
  'venta_cosecha_detalle',
]

const TABLES_WITH_FOTO = new Set()

// Columnas que existen en SQLite por compatibilidad histórica pero NO están en Supabase
const STRIP_ON_UPLOAD = {
  cosechas: ['fecha', 'cantidad', 'unidad'],
}

export function useSync() {
  const store   = useSyncStore()
  const local   = useLocalDB()
  const storage = useStorage()

  function tsOf(row) {
    const d = new Date(row?.updated_at || row?.created_at || 0)
    return isNaN(d) ? 0 : d.getTime()
  }

  // Foto local → Supabase Storage.
  // La ruta local es relativa en Directory.Data (ej: "fotos/uuid.jpg").
  // No es base64 — se lee el archivo real del filesystem.
  async function subirFotoLocal(table, row) {
    if (!TABLES_WITH_FOTO.has(table)) return row
    const foto = row.foto
    if (!foto) return row
    // Si ya es URL de Supabase, no hacer nada
    if (foto.startsWith('http')) return row

    try {
      // Leer el archivo del filesystem de la app
      const { data: base64Data } = await Filesystem.readFile({
        path:      foto,
        directory: Directory.Data,
      })

      // base64Data es un string base64 puro — convertir a Blob
      const ext  = foto.split('.').pop() || 'jpg'
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      const binary = atob(base64Data)
      const arr    = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
      const file = new File([arr], `${row.id}.${ext}`, { type: mime })

      const url = await storage.uploadFoto(file, table)

      // Borrar archivo local una vez subido
      await Filesystem.deleteFile({ path: foto, directory: Directory.Data }).catch(() => {})

      return { ...row, foto: url }
    } catch (e) {
      console.error(`[Sync] foto upload ${table}:`, e.message)
      return row // continuar sin foto si falla
    }
  }

  async function uploadUnsynced(table) {
    const unsynced = await local.getUnsynced(table)
    const strip    = STRIP_ON_UPLOAD[table]
    for (const row of unsynced) {
      try {
        let data = { ...row }
        delete data.is_synced
        delete data.synced_at
        if (strip) for (const col of strip) delete data[col]

        data = await subirFotoLocal(table, data)

        const { error } = await supabase.from(table).upsert(data, { onConflict: 'id' })
        if (error) throw error

        // Si la foto cambió (local path → URL), actualizar local también
        if (data.foto !== row.foto) {
          await local.update(table, row.id, { foto: data.foto })
        }
        await local.markSynced(table, row.id)
      } catch (e) {
        store.errors.push(`[${table}:${row.id}] ${e.message}`)
        console.error(`[Sync] upload ${table}:`, e.message)
      }
    }
  }

  async function downloadMissing(table) {
    const localAll = await useLocalDB().query(table, 'id', {})
    const localIds = new Set(localAll.map(r => r.id))

    const { data: remoteRows, error } = await supabase.from(table).select('*')
    if (error) throw error

    for (const row of remoteRows || []) {
      if (localIds.has(row.id)) {
        const localRow = localAll.find(r => r.id === row.id)
        if (localRow && tsOf(row) > tsOf(localRow)) {
          await local.upsertFromRemote(table, row)
        }
      } else {
        await local.upsertFromRemote(table, row)
      }
    }
  }

  async function countPending() {
    let total = 0
    for (const t of TABLES) {
      const rows = await local.getUnsynced(t)
      total += rows.length
    }
    store.pendingCount = total
    return total
  }

  async function syncAll() {
    if (store.syncing) return

    store.syncing = true
    store.errors  = []

    try {
      for (const table of TABLES) {
        await uploadUnsynced(table)
        await downloadMissing(table)
      }
      store.setLastSync()
      await countPending()
      return { ok: true }
    } catch (e) {
      store.errors.push(e.message)
      console.error('[Sync] error general:', e)
      return { ok: false, reason: e.message }
    } finally {
      store.syncing = false
    }
  }

  return { syncAll, countPending }
}
