import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { v4 as uuidv4 } from 'uuid'

const isNative = () => Capacitor.isNativePlatform()

export function useCamera() {

  /**
   * Abre cámara o galería.
   * Retorna: { previewUrl, file?, localPath? }
   *   - Web:    { previewUrl (blob URL), file (File) }
   *   - Nativo: { previewUrl (convertFileSrc), localPath (relativa en Data dir) }
   */
  async function tomarFoto(carpeta = 'fotos') {
    if (isNative()) {
      const photo = await Camera.getPhoto({
        quality:      90,
        allowEditing: false,
        resultType:   CameraResultType.Uri,
        source:       CameraSource.Prompt,
        saveToGallery: false,
      })

      // Copiar a directorio persistente de la app (la URI temporal puede expirar)
      const fileName = `${carpeta}/${uuidv4()}.${photo.format || 'jpg'}`
      await Filesystem.copy({
        from:      photo.path,
        to:        fileName,
        directory: Directory.Data,
      })

      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Data })
      const previewUrl = Capacitor.convertFileSrc(uri)

      return { previewUrl, localPath: fileName }
    }

    // Web: file picker estándar
    return new Promise((resolve) => {
      const input  = document.createElement('input')
      input.type   = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = e.target.files?.[0]
        resolve(file ? { previewUrl: URL.createObjectURL(file), file } : null)
      }
      input.click()
    })
  }

  return { tomarFoto }
}
