<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ isEdit ? 'Editar' : 'Nuevo' }} Usuario</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content">

      <p class="fsec-label">Datos del usuario</p>
      <ion-list inset class="fsec-list">
        <ion-item>
          <ion-icon :icon="personOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Nombre *</ion-label>
          <ion-input v-model="form.first_name" placeholder="Nombres" clearInput />
        </ion-item>
        <ion-item>
          <ion-icon :icon="personOutline" slot="start" color="medium" class="item-icon" />
          <ion-label position="stacked">Apellido</ion-label>
          <ion-input v-model="form.last_name" placeholder="Apellidos" clearInput />
        </ion-item>
        <ion-item>
          <ion-icon :icon="mailOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Correo *</ion-label>
          <ion-input v-model="form.email" type="email" placeholder="correo@ejemplo.com" :readonly="isEdit" />
        </ion-item>
        <ion-item v-if="!isEdit">
          <ion-icon :icon="lockClosedOutline" slot="start" color="medium" class="item-icon" />
          <ion-label position="stacked">Contraseña *</ion-label>
          <ion-input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" />
        </ion-item>
        <ion-item>
          <ion-icon :icon="shieldOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Rol</ion-label>
          <ion-select v-model="form.role" interface="action-sheet">
            <ion-select-option value="productor">Productor</ion-select-option>
            <ion-select-option value="tecnico">Técnico</ion-select-option>
            <ion-select-option value="admin">Administrador</ion-select-option>
            <ion-select-option value="Superadmin">Super Administrador</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item :lines="isEdit ? 'inset' : 'none'">
          <ion-icon :icon="callOutline" slot="start" color="medium" class="item-icon" />
          <ion-label position="stacked">Teléfono</ion-label>
          <ion-input v-model="form.phone" type="tel" inputmode="tel" placeholder="Número de teléfono" />
        </ion-item>
        <ion-item v-if="isEdit" lines="none">
          <ion-icon :icon="checkmarkCircleOutline" slot="start" color="success" class="item-icon" />
          <ion-label position="stacked">Estado</ion-label>
          <ion-select v-model="form.status" interface="action-sheet">
            <ion-select-option value="activo">Activo</ion-select-option>
            <ion-select-option value="inactivo">Inactivo</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <!-- Cambio de contraseña (solo edición) -->
      <template v-if="isEdit">
        <p class="fsec-label">Cambiar contraseña</p>
        <ion-list inset class="fsec-list">
          <ion-item :lines="form.nuevaPassword ? 'inset' : 'none'">
            <ion-icon :icon="lockClosedOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Nueva contraseña <span class="optional">(opcional)</span></ion-label>
            <ion-input v-model="form.nuevaPassword" :type="verPassword ? 'text' : 'password'" placeholder="Dejar vacío para no cambiar" autocomplete="new-password" />
            <ion-button slot="end" fill="clear" @click="verPassword = !verPassword">
              <ion-icon :icon="verPassword ? eyeOffOutline : eyeOutline" />
            </ion-button>
          </ion-item>
          <ion-item v-if="form.nuevaPassword" lines="none">
            <ion-icon :icon="lockClosedOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Confirmar contraseña</ion-label>
            <ion-input v-model="form.confirmarPassword" :type="verPassword ? 'text' : 'password'" placeholder="Repite la nueva contraseña" autocomplete="new-password" />
          </ion-item>
        </ion-list>
        <p v-if="form.nuevaPassword && form.confirmarPassword && form.nuevaPassword !== form.confirmarPassword" class="no-match">
          Las contraseñas no coinciden
        </p>
        <p v-if="form.nuevaPassword && form.nuevaPassword.length < 6" class="no-match">
          Mínimo 6 caracteres
        </p>
      </template>

    </ion-content>

    <ion-footer class="action-footer">
      <ion-toolbar>
        <div class="action-bar">
          <ion-button expand="block" fill="outline" color="medium" @click="$emit('cancel')">
            <ion-icon slot="start" :icon="closeOutline" /> Cancelar
          </ion-button>
          <ion-button expand="block" fill="solid" color="success" @click="guardar" :disabled="saving">
            <ion-spinner v-if="saving" name="crescent" slot="start" style="width:18px;height:18px" />
            <ion-icon v-else slot="start" :icon="saveOutline" />
            Guardar
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonSpinner, IonFooter, toastController,
} from '@ionic/vue'
import {
  saveOutline, eyeOutline, eyeOffOutline, closeOutline,
  personOutline, mailOutline, lockClosedOutline, shieldOutline, callOutline, checkmarkCircleOutline,
} from 'ionicons/icons'
import { useUsers } from '../../composables/useUsers'

const props = defineProps({ usuario: { type: Object, default: null } })
const emit  = defineEmits(['saved', 'cancel'])

const { crear, editar, cambiarPassword } = useUsers()
const saving     = ref(false)
const verPassword = ref(false)
const isEdit = computed(() => !!props.usuario)

const emptyForm = () => ({
  first_name: '', last_name: '', email: '', password: '',
  role: 'productor', phone: '', status: 'activo',
  nuevaPassword: '', confirmarPassword: '',
})

const form = ref(emptyForm())

watch(() => props.usuario, (val) => {
  form.value = val
    ? {
        first_name:         val.first_name || '',
        last_name:          val.last_name  || '',
        email:              val.email      || '',
        password:           '',
        role:               val.role       || 'productor',
        phone:              val.phone      || '',
        status:             val.status     || 'activo',
        nuevaPassword:      '',
        confirmarPassword:  '',
      }
    : emptyForm()
}, { immediate: true })

const passwordValida = computed(() => {
  if (!form.value.nuevaPassword) return true  // vacío = no cambiar
  if (form.value.nuevaPassword.length < 6) return false
  return form.value.nuevaPassword === form.value.confirmarPassword
})

async function guardar() {
  if (!form.value.first_name?.trim()) return toast('El nombre es requerido', 'warning')
  if (!form.value.email?.trim())      return toast('El correo es requerido', 'warning')
  if (!isEdit.value && !form.value.password?.trim()) return toast('La contraseña es requerida', 'warning')
  if (!passwordValida.value) return toast('Revisa la nueva contraseña', 'warning')

  saving.value = true
  try {
    if (isEdit.value) {
      const { password, nuevaPassword, confirmarPassword, ...changes } = form.value
      await editar(props.usuario.id, changes)

      // Cambiar contraseña si se ingresó una nueva
      if (nuevaPassword) {
        await cambiarPassword(props.usuario.auth_id, nuevaPassword)
      }
    } else {
      await crear(form.value)
    }
    emit('saved')
  } catch (e) {
    toast('Error: ' + e.message, 'danger')
  } finally {
    saving.value = false
  }
}

async function toast(message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' })
  t.present()
}
</script>

<style scoped>
.form-content { --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 90px; }

.fsec-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--ion-color-medium); padding: 20px 32px 4px; margin: 0;
}
.fsec-list { margin-bottom: 0 !important; }
.item-icon { font-size: 1.15rem; flex-shrink: 0; }

.optional { color: var(--ion-color-medium); font-weight: 400; font-size: 0.85em; }
.no-match { color: var(--ion-color-danger); font-size: 0.78rem; padding: 4px 32px 0; margin: 0; }

.action-footer ion-toolbar { --background: var(--ion-background-color); --border-color: transparent; box-shadow: 0 -2px 16px rgba(0,0,0,0.1); }
.action-bar { display: flex; gap: 12px; padding: 10px 16px 14px; }
.action-bar ion-button { flex: 1; --border-radius: 12px; height: 50px; font-size: 0.95rem; font-weight: 700; }
</style>
