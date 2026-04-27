import { supabase } from '../config/supabase'

const BUCKET = 'agricola'

export function useStorage() {

  async function uploadFoto(file, carpeta = 'general') {
    const ext  = file.name.split('.').pop()
    const path = `${carpeta}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) {
      console.error('[Storage] upload:', error)
      throw new Error(error.message)
    }
    return getUrl(path)
  }

  function getUrl(path) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function eliminarFoto(url) {
    // Extraer el path relativo de la URL pública
    const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1]
    if (!path) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) console.error('[Storage] delete:', error)
  }

  return { uploadFoto, getUrl, eliminarFoto }
}
