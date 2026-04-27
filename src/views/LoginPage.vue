<template>
  <ion-page>
    <ion-content class="ion-padding login-content">
      <div class="login-container">

        <div class="login-header">
          <ion-icon :icon="leafOutline" class="app-icon" />
          <h1>Agrícola</h1>
          <p>Sistema de Gestión Agrícola</p>
        </div>

        <ion-card class="login-card">
          <ion-card-content>

            <ion-item lines="full">
              <ion-label position="floating">Correo electrónico</ion-label>
              <ion-input
                v-model="form.email"
                type="email"
                autocomplete="email"
                inputmode="email"
                @keyup.enter="handleLogin"
              />
            </ion-item>

            <ion-item lines="full" class="ion-margin-top">
              <ion-label position="floating">Contraseña</ion-label>
              <ion-input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                @keyup.enter="handleLogin"
              />
              <ion-button slot="end" fill="clear" @click="showPassword = !showPassword">
                <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
              </ion-button>
            </ion-item>

            <!-- Mensaje de error inline -->
            <div v-if="errorMsg" class="error-msg">
              <ion-icon :icon="alertCircleOutline" />
              {{ errorMsg }}
            </div>

            <ion-button
              expand="block"
              class="ion-margin-top"
              :disabled="loading"
              @click="handleLogin"
            >
              <ion-spinner v-if="loading" name="crescent" />
              <span v-else>Ingresar</span>
            </ion-button>

          </ion-card-content>
        </ion-card>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonCard, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonSpinner,
  toastController,
} from '@ionic/vue'
import { leafOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form    = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''

  console.log('[Login] handleLogin llamado', form.value.email)

  if (!form.value.email?.trim() || !form.value.password?.trim()) {
    errorMsg.value = 'Ingresa tu correo y contraseña'
    return
  }

  loading.value = true
  try {
    await auth.login(form.value.email.trim(), form.value.password)
    console.log('[Login] login exitoso, navegando a /tabs/home')
    router.replace('/tabs/home')
  } catch (err) {
    console.error('[Login] error:', err)
    errorMsg.value = translateError(err?.message || String(err))
    showToast(errorMsg.value)
  } finally {
    loading.value = false
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

async function showToast(message) {
  const t = await toastController.create({
    message,
    duration: 3500,
    color: 'danger',
    position: 'top',
    buttons: [{ text: 'OK', role: 'cancel' }],
  })
  await t.present()
}
</script>

<style scoped>
.login-content {
  --background: var(--ion-color-light);
}
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
.login-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 8px 0 4px;
}
.login-header p {
  color: var(--ion-color-medium);
  margin: 0;
}
.app-icon {
  font-size: 64px;
}
.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
}
.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ion-color-danger);
  font-size: 0.875rem;
  margin-top: 12px;
  padding: 8px 4px;
}
</style>
