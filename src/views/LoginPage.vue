<template>
  <ion-page>
    <ion-content class="ion-padding login-content">
      <div class="login-container">

        <div class="login-header">
          <ion-icon :icon="leafOutline" class="app-icon" />
          <h1>AGROGEST</h1>
          <p>Sistema de Gestión Agrícola</p>
        </div>

        <ion-card class="login-card">
          <ion-card-content>

            <ion-input
              label="Correo electrónico"
              label-placement="floating"
              fill="outline"
              v-model="form.email"
              type="email"
              autocomplete="email"
              inputmode="email"
              @keyup.enter="handleLogin"
              :disabled="syncing"
            />

            <ion-input
              label="Contraseña"
              label-placement="floating"
              fill="outline"
              class="ion-margin-top"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              @keyup.enter="handleLogin"
              :disabled="syncing"
            >
              <ion-button slot="end" fill="clear" @click="showPassword = !showPassword" :disabled="syncing">
                <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
              </ion-button>
            </ion-input>

            <!-- Error inline -->
            <div v-if="errorMsg" class="error-msg">
              <ion-icon :icon="alertCircleOutline" />
              {{ errorMsg }}
            </div>

            <!-- Progreso de sincronización -->
            <div v-if="syncing" class="sync-progress">
              <ion-spinner name="crescent" color="primary" />
              <div class="sync-texto">
                <strong>{{ syncMsg }}</strong>
                <small>No cierres la aplicación</small>
              </div>
            </div>

            <ion-button
              expand="block"
              class="ion-margin-top"
              :disabled="loading || syncing"
              @click="handleLogin"
            >
              <ion-spinner v-if="loading || syncing" name="crescent" />
              <span v-else>Ingresar</span>
            </ion-button>

          </ion-card-content>
        </ion-card>

        <!-- Aviso de sesión 12h -->
        <p class="sesion-nota">La sesión dura 12 horas por seguridad</p>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonCard, IonCardContent,
  IonInput, IonButton, IonIcon, IonSpinner,
  toastController,
} from '@ionic/vue'
import { leafOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons'
import { Network } from '@capacitor/network'
import { useAuthStore } from '../stores/auth'
import { useSync } from '../composables/useSync'

const auth   = useAuthStore()
const router = useRouter()
const { syncAll } = useSync()

const form         = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading      = ref(false)
const syncing      = ref(false)
const syncMsg      = ref('')
const errorMsg     = ref('')

const isNative = () => !!window.Capacitor?.isNativePlatform?.()

async function checkOnline() {
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return navigator.onLine
  }
}

async function handleLogin() {
  errorMsg.value = ''

  if (!form.value.email?.trim() || !form.value.password?.trim()) {
    errorMsg.value = 'Ingresa tu correo y contraseña'
    return
  }

  loading.value = true
  try {
    // 1. Autenticar contra Supabase
    await auth.login(form.value.email.trim(), form.value.password)

    // 2. En dispositivo nativo: sincronizar SQLite antes de entrar
    if (isNative()) {
      const online       = await checkOnline()
      const firstSyncOk  = !!localStorage.getItem('sync_first_done')

      if (!online && !firstSyncOk) {
        // Primera vez sin conexión: imposible usar la app sin datos locales
        await auth.logout()
        errorMsg.value = 'Necesitas conexión a internet la primera vez. Conéctate y vuelve a intentarlo.'
        return
      }

      if (online) {
        // Sync obligatorio: subir cambios locales + bajar nuevos datos
        loading.value = false
        syncing.value = true
        syncMsg.value = 'Sincronizando datos con el servidor...'

        const resultado = await syncAll()

        if (resultado?.ok) {
          localStorage.setItem('sync_first_done', '1')
          syncMsg.value = '¡Sincronización completada!'
          await new Promise(r => setTimeout(r, 600)) // pausa visual breve
        } else {
          // Sync falló pero ya hay datos locales → advertir y dejar pasar
          await showToast('Sincronización parcial. Algunos datos pueden no estar actualizados.', 'warning')
        }
        syncing.value = false
      } else {
        // Sin conexión pero ya tiene datos locales → advertir y dejar pasar
        await showToast('Sin conexión. Trabajando con datos locales.', 'warning')
      }
    }

    // 3. Entrar a la app
    router.replace('/tabs/home')

  } catch (err) {
    errorMsg.value = translateError(err?.message || String(err))
    await showToast(errorMsg.value, 'danger')
  } finally {
    loading.value = false
    syncing.value = false
  }
}

function translateError(msg) {
  if (!msg) return 'Error desconocido'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Correo o contraseña incorrectos'
  if (msg.includes('Email not confirmed'))
    return 'Debes confirmar tu correo antes de ingresar'
  if (msg.includes('User not found'))
    return 'Usuario no encontrado'
  if (msg.includes('Too many requests'))
    return 'Demasiados intentos. Espera unos minutos'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch'))
    return 'Error de red. Verifica tu conexión a internet'
  return msg
}

async function showToast(message, color = 'danger') {
  const t = await toastController.create({
    message,
    duration: 4000,
    color,
    position: 'top',
    buttons: [{ text: 'OK', role: 'cancel' }],
  })
  await t.present()
}
</script>

<style scoped>
.login-content { --background: var(--ion-color-light); }
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 20px;
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
  color: var(--ion-color-primary);
}
.login-header h1 { font-size: 2rem; font-weight: 700; margin: 8px 0 4px; }
.login-header p  { color: var(--ion-color-medium); margin: 0; }
.app-icon { font-size: 64px; }
.login-card { width: 100%; max-width: 400px; border-radius: 16px; }

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ion-color-danger);
  font-size: 0.875rem;
  margin-top: 12px;
  padding: 8px 4px;
}

.sync-progress {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--ion-color-light);
  border-radius: 10px;
  padding: 14px;
  margin-top: 14px;
}
.sync-texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sync-texto strong { font-size: 14px; color: var(--ion-color-dark); }
.sync-texto small  { font-size: 12px; color: var(--ion-color-medium); }

.sesion-nota {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 16px;
  text-align: center;
}
</style>
