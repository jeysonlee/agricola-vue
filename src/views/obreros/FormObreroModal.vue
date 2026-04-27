<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-button @click="$emit('cancel')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button></ion-buttons>
        <ion-title>{{ isEdit ? 'Editar' : 'Nuevo' }} Obrero</ion-title>
        <ion-buttons slot="end"><ion-button @click="guardar" :disabled="saving"><ion-spinner v-if="saving" name="crescent" /><ion-icon v-else slot="icon-only" :icon="checkmarkOutline" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Avatar / foto de perfil -->
      <div class="avatar-section" @click="elegirFoto">
        <div class="avatar-wrap">
          <img v-if="previewUrl" :src="previewUrl" alt="Foto" class="avatar-img" />
          <div v-else class="avatar-placeholder">
            <ion-icon :icon="personOutline" />
          </div>
          <div class="avatar-badge">
            <ion-icon :icon="cameraOutline" />
          </div>
        </div>
        <p class="avatar-hint">Toca para cambiar foto</p>
      </div>
      <ion-button v-if="previewUrl" fill="clear" color="danger" size="small" class="ion-margin-bottom" @click="quitarFoto">
        <ion-icon slot="start" :icon="trashOutline" /> Quitar foto
      </ion-button>

      <ion-list>
        <ion-item><ion-label position="stacked">Nombre Completo *</ion-label><ion-input v-model="form.nombre" placeholder="Nombre completo" required /></ion-item>
        <ion-item><ion-label position="stacked">DNI</ion-label><ion-input v-model="form.dni" placeholder="Número de DNI" /></ion-item>
        <ion-item><ion-label position="stacked">Cargo / Rol</ion-label><ion-input v-model="form.cargo" placeholder="Ej: Jornalero, Supervisor" /></ion-item>
        <ion-item><ion-label position="stacked">Teléfono</ion-label><ion-input v-model="form.telefono" type="tel" placeholder="Número de teléfono" /></ion-item>
        <ion-item><ion-label position="stacked">Dirección</ion-label><ion-input v-model="form.direccion" placeholder="Dirección" /></ion-item>
        <ion-item><ion-label position="stacked">Salario Diario</ion-label><ion-input v-model="form.salario" type="number" placeholder="0.00" /></ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel, IonInput, IonSpinner, toastController } from '@ionic/vue'
import { closeOutline, checkmarkOutline, cameraOutline, trashOutline, personOutline } from 'ionicons/icons'
import { useObreros } from '../../composables/useObreros'
import { useStorage } from '../../composables/useStorage'
import { useCamera } from '../../composables/useCamera'

const props = defineProps({ obrero: { type: Object, default: null } })
const emit  = defineEmits(['saved', 'cancel'])
const { crear, editar }            = useObreros()
const { uploadFoto, eliminarFoto } = useStorage()
const { tomarFoto }                = useCamera()

const saving       = ref(false)
const isEdit       = computed(() => !!props.obrero)
const pendingFoto  = ref(null)
const previewUrl   = ref(null)
const fotoOriginal = ref(null)

const form = ref({ nombre: '', dni: '', cargo: '', telefono: '', direccion: '', salario: '', foto: null })

watch(() => props.obrero, (val) => {
  pendingFoto.value = null
  if (val) {
    form.value         = { nombre: val.nombre || '', dni: val.dni || '', cargo: val.cargo || '', telefono: val.telefono || '', direccion: val.direccion || '', salario: val.salario || '', foto: val.foto || null }
    previewUrl.value   = val.foto || null
    fotoOriginal.value = val.foto || null
  } else {
    form.value         = { nombre: '', dni: '', cargo: '', telefono: '', direccion: '', salario: '', foto: null }
    previewUrl.value   = null
    fotoOriginal.value = null
  }
}, { immediate: true })

async function elegirFoto() {
  try {
    const result = await tomarFoto('obreros')
    if (!result) return
    pendingFoto.value = result
    previewUrl.value  = result.previewUrl
  } catch (e) {
    if (!e.message?.includes('cancelled') && !e.message?.includes('cancel')) {
      const t = await toastController.create({ message: 'No se pudo abrir la cámara', duration: 2000, color: 'warning', position: 'top' })
      t.present()
    }
  }
}

function quitarFoto() {
  pendingFoto.value  = null
  previewUrl.value   = null
  form.value.foto    = null
}

async function guardar() {
  if (!form.value.nombre?.trim()) {
    const t = await toastController.create({ message: 'El nombre es requerido', duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }
  saving.value = true
  try {
    const data = { ...form.value, salario: parseFloat(form.value.salario) || null }
    if (pendingFoto.value) {
      if (fotoOriginal.value?.startsWith('http')) eliminarFoto(fotoOriginal.value)
      if (pendingFoto.value.file) {
        data.foto = await uploadFoto(pendingFoto.value.file, 'obreros')
      } else {
        data.foto = pendingFoto.value.localPath
      }
    } else if (!previewUrl.value) {
      data.foto = null
    }
    if (isEdit.value) await editar(props.obrero.id, data)
    else await crear(data)
    emit('saved')
  } catch (e) {
    const t = await toastController.create({ message: 'Error: ' + e.message, duration: 2500, color: 'danger', position: 'top' })
    t.present()
  } finally { saving.value = false }
}
</script>

<style scoped>
.avatar-section  { display: flex; flex-direction: column; align-items: center; padding: 20px 0 8px; }
.avatar-wrap     { position: relative; width: 96px; height: 96px; cursor: pointer; }
.avatar-img      { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid var(--ion-color-primary); }
.avatar-placeholder {
  width: 96px; height: 96px; border-radius: 50%;
  background: var(--ion-color-light-shade);
  display: flex; align-items: center; justify-content: center;
  border: 3px dashed var(--ion-color-medium);
}
.avatar-placeholder ion-icon { font-size: 2.5rem; color: var(--ion-color-medium); }
.avatar-badge {
  position: absolute; bottom: 2px; right: 2px;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--ion-color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
}
.avatar-badge ion-icon { font-size: 1rem; }
.avatar-hint { font-size: 0.75rem; color: var(--ion-color-medium); margin: 6px 0 0; }
</style>
