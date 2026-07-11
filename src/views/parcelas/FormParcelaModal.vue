<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="$emit('cancel')">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Editar' : 'Nueva' }} Parcela</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="guardar" :disabled="saving || !isFormValid">
            <ion-spinner v-if="saving" name="crescent" />
            <ion-icon v-else slot="icon-only" :icon="checkmarkOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>

        <!-- Solo visible para superadmin / admin -->
        <ion-item v-if="isSuperadmin" lines="full">
          <ion-label position="stacked">Usuario asignado (productor) *</ion-label>
          <ion-select v-model="usuarioId" placeholder="Seleccionar productor..." interface="action-sheet">
            <ion-select-option v-for="u in usuarios" :key="u.id" :value="u.id">
              {{ nombreUsuario(u) }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Nombre *</ion-label>
          <ion-input v-model="form.nombre" placeholder="Nombre de la parcela" clearInput />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Ubicación</ion-label>
          <ion-input v-model="form.ubicacion" placeholder="Ubicación o dirección" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Área (ha)</ion-label>
          <ion-input v-model="form.area" inputmode="decimal" placeholder="0.00" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Tipo de Cultivo</ion-label>
          <ion-input v-model="form.cultivo" placeholder="Ej: Cacao, Café, Maíz..." />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Descripción</ion-label>
          <ion-textarea v-model="form.descripcion" placeholder="Descripción adicional" :rows="3" />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonTextarea, IonSpinner,
  IonSelect, IonSelectOption, toastController,
} from '@ionic/vue'
import { closeOutline, checkmarkOutline } from 'ionicons/icons'
import { useParcelas } from '../../composables/useParcelas'
import { useParcelaUsers } from '../../composables/useParcelaUsers'

const props = defineProps({
  parcela:      { type: Object,  default: null },
  isSuperadmin: { type: Boolean, default: false },
  usuarios:     { type: Array,   default: () => [] },
  currentUserId:{ type: String,  default: '' },
})
const emit = defineEmits(['saved', 'cancel'])

const { crearConUsuario, editar } = useParcelas()
const { porParcela: parcelaUsersPorParcela, crear: crearParcelaUser, editar: editarParcelaUser } = useParcelaUsers()
const saving    = ref(false)
const isEdit    = computed(() => !!props.parcela)
const usuarioId = ref(props.currentUserId)

// Usuario actualmente asignado en parcela_users (para saber si cambió al guardar)
const usuarioIdOriginal = ref('')
let asignacionProductorId = null

const form = ref({ nombre: '', ubicacion: '', area: '', cultivo: '', descripcion: '' })

const isFormValid = computed(() => {
  if (!form.value.nombre?.trim()) return false
  if (props.isSuperadmin && !usuarioId.value) return false
  return true
})

watch(() => props.parcela, async (val) => {
  form.value = val
    ? { nombre: val.nombre || '', ubicacion: val.ubicacion || '', area: val.area || '', cultivo: val.cultivo || '', descripcion: val.descripcion || '' }
    : { nombre: '', ubicacion: '', area: '', cultivo: '', descripcion: '' }

  if (val) {
    // Cargar el usuario (productor) realmente asignado a esta parcela
    const asignaciones = await parcelaUsersPorParcela(val.id)
    const productor = asignaciones.find(a => a.rol === 'productor') || asignaciones[0] || null
    asignacionProductorId    = productor?.id || null
    usuarioId.value          = productor?.user_id || ''
    usuarioIdOriginal.value  = usuarioId.value
  } else {
    asignacionProductorId   = null
    usuarioIdOriginal.value = ''
  }
}, { immediate: true })

// Solo aplica el usuario logueado como valor por defecto al CREAR (nunca pisa el dueño real en edición)
watch(() => props.currentUserId, (val) => { if (!isEdit.value) usuarioId.value = val }, { immediate: true })

function nombreUsuario(u) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
  return full || u.username || u.email || ''
}

async function guardar() {
  if (!isFormValid.value) {
    const msg = !form.value.nombre?.trim()
      ? 'El nombre es requerido'
      : 'Debe seleccionar un usuario'
    const t = await toastController.create({ message: msg, duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }

  saving.value = true
  try {
    const data = { ...form.value, area: parseFloat(form.value.area) || null }

    if (isEdit.value) {
      await editar(props.parcela.id, data)
      // Reasignar usuario solo si superadmin/admin lo cambió; si no cambió, se deja igual
      if (props.isSuperadmin && usuarioId.value && usuarioId.value !== usuarioIdOriginal.value) {
        if (asignacionProductorId) {
          await editarParcelaUser(asignacionProductorId, { user_id: usuarioId.value })
        } else {
          await crearParcelaUser({ parcela_id: props.parcela.id, user_id: usuarioId.value, rol: 'productor' })
        }
      }
    } else {
      const userId = props.isSuperadmin ? usuarioId.value : props.currentUserId
      await crearConUsuario(data, userId, 'productor')
    }
    emit('saved')
  } catch (e) {
    const t = await toastController.create({ message: 'Error: ' + e.message, duration: 2500, color: 'danger', position: 'top' })
    t.present()
  } finally {
    saving.value = false
  }
}
</script>
