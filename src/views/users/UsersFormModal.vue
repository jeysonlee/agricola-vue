<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="$emit('cancel')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Editar' : 'Nuevo' }} Usuario</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="guardar" :disabled="saving">
            <ion-spinner v-if="saving" name="crescent" />
            <ion-icon v-else slot="icon-only" :icon="checkmarkOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-label position="stacked">Nombre *</ion-label>
          <ion-input v-model="form.first_name" placeholder="Nombres" clearInput />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Apellido</ion-label>
          <ion-input v-model="form.last_name" placeholder="Apellidos" clearInput />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Correo *</ion-label>
          <ion-input v-model="form.email" type="email" placeholder="correo@ejemplo.com" :readonly="isEdit" />
        </ion-item>
        <ion-item v-if="!isEdit">
          <ion-label position="stacked">Contraseña *</ion-label>
          <ion-input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Rol</ion-label>
          <ion-select v-model="form.role" interface="action-sheet">
            <ion-select-option value="productor">Productor</ion-select-option>
            <ion-select-option value="tecnico">Técnico</ion-select-option>
            <ion-select-option value="admin">Administrador</ion-select-option>
            <ion-select-option value="Superadmin">Super Administrador</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Teléfono</ion-label>
          <ion-input v-model="form.phone" type="tel" inputmode="tel" placeholder="Número de teléfono" />
        </ion-item>
        <ion-item v-if="isEdit">
          <ion-label position="stacked">Estado</ion-label>
          <ion-select v-model="form.status" interface="action-sheet">
            <ion-select-option value="activo">Activo</ion-select-option>
            <ion-select-option value="inactivo">Inactivo</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonSpinner, toastController,
} from '@ionic/vue'
import { closeOutline, checkmarkOutline } from 'ionicons/icons'
import { useUsers } from '../../composables/useUsers'

const props = defineProps({ usuario: { type: Object, default: null } })
const emit  = defineEmits(['saved', 'cancel'])

const { crear, editar } = useUsers()
const saving = ref(false)
const isEdit = computed(() => !!props.usuario)

const form = ref({ first_name: '', last_name: '', email: '', password: '', role: 'user', phone: '', status: 'activo' })

watch(() => props.usuario, (val) => {
  form.value = val
    ? {
        first_name: val.first_name || '',
        last_name:  val.last_name  || '',
        email:      val.email      || '',
        password:   '',
        role:       val.role       || 'user',
        phone:      val.phone      || '',
        status:     val.status     || 'activo',
      }
    : { first_name: '', last_name: '', email: '', password: '', role: 'user', phone: '', status: 'activo' }
}, { immediate: true })

async function guardar() {
  if (!form.value.first_name?.trim()) {
    const t = await toastController.create({ message: 'El nombre es requerido', duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }
  if (!form.value.email?.trim()) {
    const t = await toastController.create({ message: 'El correo es requerido', duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }
  if (!isEdit.value && !form.value.password?.trim()) {
    const t = await toastController.create({ message: 'La contraseña es requerida', duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const { password, ...changes } = form.value
      await editar(props.usuario.id, changes)
    } else {
      await crear(form.value)
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
