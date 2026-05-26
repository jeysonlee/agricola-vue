<template>
  <ion-page>
    <AppHeader title="Mi Perfil" :show-back="false" />

    <ion-content class="ion-padding">

      <!-- Avatar inicial -->
      <div class="profile-avatar">
        <div class="avatar-circle">{{ iniciales }}</div>
        <h2 class="profile-name">{{ auth.displayName || auth.currentUser?.email }}</h2>
        <ion-badge :color="roleColor(auth.currentUser?.role)" class="role-badge">
          {{ auth.currentUser?.role || 'usuario' }}
        </ion-badge>
      </div>

      <!-- Datos personales -->
      <ion-card>
        <ion-card-header>
          <ion-card-title class="section-title">
            <ion-icon :icon="personOutline" /> Datos personales
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">Nombre</ion-label>
              <ion-input v-model="form.first_name" placeholder="Tu nombre" clearInput />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Apellido</ion-label>
              <ion-input v-model="form.last_name" placeholder="Tu apellido" clearInput />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Correo</ion-label>
              <ion-input :value="auth.currentUser?.email" readonly />
            </ion-item>
            <ion-item lines="none">
              <ion-label position="stacked">Teléfono</ion-label>
              <ion-input v-model="form.phone" type="tel" inputmode="tel" placeholder="Número de teléfono" clearInput />
            </ion-item>
          </ion-list>
          <div style="padding: 12px 0 4px">
            <ion-button expand="block" @click="guardarPerfil" :disabled="savingPerfil">
              <ion-spinner v-if="savingPerfil" name="crescent" />
              <template v-else>
                <ion-icon slot="start" :icon="saveOutline" /> Guardar datos
              </template>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Cambiar contraseña -->
      <ion-card>
        <ion-card-header>
          <ion-card-title class="section-title">
            <ion-icon :icon="lockClosedOutline" /> Cambiar contraseña
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">Contraseña actual</ion-label>
              <ion-input
                v-model="pwd.actual"
                :type="ver.actual ? 'text' : 'password'"
                placeholder="Contraseña actual"
                autocomplete="current-password"
              />
              <ion-button slot="end" fill="clear" @click="ver.actual = !ver.actual">
                <ion-icon :icon="ver.actual ? eyeOffOutline : eyeOutline" />
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Nueva contraseña</ion-label>
              <ion-input
                v-model="pwd.nueva"
                :type="ver.nueva ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
              />
              <ion-button slot="end" fill="clear" @click="ver.nueva = !ver.nueva">
                <ion-icon :icon="ver.nueva ? eyeOffOutline : eyeOutline" />
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label position="stacked">Confirmar contraseña</ion-label>
              <ion-input
                v-model="pwd.confirmar"
                :type="ver.confirmar ? 'text' : 'password'"
                placeholder="Repite la nueva contraseña"
                autocomplete="new-password"
              />
              <ion-button slot="end" fill="clear" @click="ver.confirmar = !ver.confirmar">
                <ion-icon :icon="ver.confirmar ? eyeOffOutline : eyeOutline" />
              </ion-button>
            </ion-item>
          </ion-list>

          <!-- Indicador de seguridad -->
          <div v-if="pwd.nueva" class="strength-row">
            <div class="strength-bar">
              <div class="strength-fill" :class="strengthClass" :style="{ width: strengthPct + '%' }" />
            </div>
            <span class="strength-label" :class="strengthClass">{{ strengthLabel }}</span>
          </div>
          <p v-if="pwd.nueva && pwd.confirmar && pwd.nueva !== pwd.confirmar" class="msg-error">
            Las contraseñas no coinciden
          </p>

          <div style="padding: 12px 0 4px">
            <ion-button expand="block" color="medium" @click="guardarPassword" :disabled="savingPwd || !pwdValida">
              <ion-spinner v-if="savingPwd" name="crescent" />
              <template v-else>
                <ion-icon slot="start" :icon="lockClosedOutline" /> Actualizar contraseña
              </template>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonSpinner, IonBadge,
  toastController,
} from '@ionic/vue'
import {
  personOutline, saveOutline, lockClosedOutline,
  eyeOutline, eyeOffOutline,
} from 'ionicons/icons'
import { supabase } from '../config/supabase'
import { useAuthStore } from '../stores/auth'
import { useUsers } from '../composables/useUsers'

const auth  = useAuthStore()
const { editar } = useUsers()

const savingPerfil = ref(false)
const savingPwd    = ref(false)

const form = ref({ first_name: '', last_name: '', phone: '' })
const pwd  = ref({ actual: '', nueva: '', confirmar: '' })
const ver  = ref({ actual: false, nueva: false, confirmar: false })

onMounted(() => {
  const u = auth.currentUser
  if (u) {
    form.value.first_name = u.first_name || ''
    form.value.last_name  = u.last_name  || ''
    form.value.phone      = u.phone      || ''
  }
})

const iniciales = computed(() => {
  const u = auth.currentUser
  if (!u) return '?'
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || ''
  return name.split(/[\s@]/).map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'
})

// Seguridad de contraseña
const strengthPct = computed(() => {
  const p = pwd.value.nueva
  if (!p) return 0
  let s = 0
  if (p.length >= 6)           s += 25
  if (p.length >= 10)          s += 20
  if (/[A-Z]/.test(p))        s += 20
  if (/[0-9]/.test(p))        s += 20
  if (/[^A-Za-z0-9]/.test(p)) s += 15
  return Math.min(s, 100)
})
const strengthClass = computed(() => strengthPct.value < 40 ? 'weak' : strengthPct.value < 70 ? 'medium' : 'strong')
const strengthLabel = computed(() => strengthPct.value < 40 ? 'Débil' : strengthPct.value < 70 ? 'Moderada' : 'Fuerte')

const pwdValida = computed(() =>
  !!pwd.value.actual &&
  pwd.value.nueva.length >= 6 &&
  pwd.value.nueva === pwd.value.confirmar
)

function roleColor(role) {
  const r = role?.toLowerCase()
  if (r === 'superadmin') return 'danger'
  if (r === 'admin')      return 'warning'
  if (r === 'tecnico')    return 'tertiary'
  return 'primary'
}

async function guardarPerfil() {
  if (!auth.currentUser?.id) return
  savingPerfil.value = true
  try {
    const changes = {
      first_name: form.value.first_name,
      last_name:  form.value.last_name,
      phone:      form.value.phone || null,
    }
    await editar(auth.currentUser.id, changes)
    // Actualizar store local
    auth.currentUser = { ...auth.currentUser, ...changes }
    localStorage.setItem('currentUser', JSON.stringify(auth.currentUser))
    toast('Datos actualizados correctamente', 'success')
  } catch (e) {
    toast('Error: ' + e.message, 'danger')
  } finally {
    savingPerfil.value = false
  }
}

async function guardarPassword() {
  if (!pwdValida.value) return
  savingPwd.value = true
  try {
    // Verificar contraseña actual
    const { data } = await supabase.auth.getSession()
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email:    data?.session?.user?.email,
      password: pwd.value.actual,
    })
    if (loginErr) return toast('Contraseña actual incorrecta', 'danger')

    const { error } = await supabase.auth.updateUser({ password: pwd.value.nueva })
    if (error) return toast('Error: ' + error.message, 'danger')

    pwd.value = { actual: '', nueva: '', confirmar: '' }
    toast('Contraseña actualizada correctamente', 'success')
  } catch (e) {
    toast('Error: ' + e.message, 'danger')
  } finally {
    savingPwd.value = false
  }
}

async function toast(message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' })
  t.present()
}
</script>

<style scoped>
.profile-avatar {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px 0 16px; gap: 8px;
}
.avatar-circle {
  width: 80px; height: 80px; border-radius: 50%;
  background: var(--ion-color-primary); color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
}
.profile-name { margin: 0; font-size: 1.1rem; font-weight: 600; }
.role-badge { font-size: 0.75rem; padding: 4px 12px; border-radius: 20px; }

.section-title { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
.section-title ion-icon { font-size: 1rem; }

.strength-row { display: flex; align-items: center; gap: 10px; padding: 8px 0 2px; }
.strength-bar { flex: 1; height: 4px; background: var(--ion-color-light-shade); border-radius: 4px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 4px; transition: width 0.3s, background 0.3s; }
.strength-fill.weak   { background: var(--ion-color-danger); }
.strength-fill.medium { background: var(--ion-color-warning); }
.strength-fill.strong { background: var(--ion-color-success); }
.strength-label { font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
.strength-label.weak   { color: var(--ion-color-danger); }
.strength-label.medium { color: var(--ion-color-warning-shade); }
.strength-label.strong { color: var(--ion-color-success); }
.msg-error { color: var(--ion-color-danger); font-size: 0.78rem; padding: 4px 0 0; margin: 0; }
</style>
