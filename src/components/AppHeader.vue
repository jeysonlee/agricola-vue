<template>
  <ion-header>
    <ion-toolbar color="primary" class="main-toolbar">
      <!-- Izquierda: hamburger o back -->
      <ion-buttons slot="start">
        <ion-back-button v-if="showBack" :default-href="backHref" color="light" text="" />
        <ion-menu-button v-else color="light" auto-hide="true" />
      </ion-buttons>

      <!-- Centro: nombre app (vistas principales) o título (vistas de formulario) -->
      <ion-title class="toolbar-center-title">
        <template v-if="!showBack">
          <ion-icon :icon="leafOutline" class="brand-leaf" />
          AGROGEST
        </template>
        <template v-else>{{ title }}</template>
      </ion-title>

      <!-- Derecha: sync + avatar -->
      <ion-buttons slot="end">
        <slot v-if="showBack" name="end" />
        <ion-button v-if="isNative" fill="clear" @click="handleSync" :disabled="sync.syncing" class="sync-btn" title="Sincronizar">
          <ion-icon v-if="!sync.syncing" :icon="cloudUploadOutline" color="light" />
          <ion-spinner v-else name="crescent" color="light" style="width:18px;height:18px" />
          <ion-badge v-if="sync.pendingCount > 0 && !sync.syncing" color="warning" class="sync-badge">
            {{ sync.pendingCount > 99 ? '99+' : sync.pendingCount }}
          </ion-badge>
        </ion-button>
        <ion-button fill="clear" class="avatar-btn" @click="openPopover">
          <div class="header-avatar">{{ initials }}</div>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

    <!-- Hero de sección (solo vistas principales) -->
    <div v-if="!showBack && title" class="section-hero">
      <div class="hero-deco-1" />
      <div class="hero-deco-2" />
      <div class="hero-accent" />
      <span class="hero-title">{{ title }}</span>
      <div class="hero-actions">
        <slot name="end" />
      </div>
    </div>

    <slot name="below" />
  </ion-header>

  <Teleport to="body">
    <ion-popover
      :is-open="popoverOpen"
      :event="popoverEvent"
      @didDismiss="popoverOpen = false"
      :dismiss-on-select="true"
    >
      <ion-content>
        <div class="popover-user-header">
          <div class="popover-avatar">{{ initials }}</div>
          <div class="popover-user-info">
            <strong>{{ auth.currentUser?.name || auth.currentUser?.email?.split('@')[0] }}</strong>
            <small>{{ auth.currentUser?.email }}</small>
            <span class="popover-role">{{ auth.currentUser?.role || 'usuario' }}</span>
          </div>
        </div>
        <ion-list lines="none" class="popover-list">
          <ion-item button lines="none" @click="popoverOpen = false">
            <ion-icon :icon="personCircleOutline" slot="start" color="primary" />
            <ion-label>Mi Perfil</ion-label>
          </ion-item>
          <ion-item button lines="none" @click="handleLogout">
            <ion-icon :icon="logOutOutline" slot="start" color="danger" />
            <ion-label color="danger">Cerrar sesión</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonHeader, IonToolbar, IonTitle, IonButtons,
  IonMenuButton, IonBackButton, IonButton, IonIcon, IonBadge, IonSpinner,
  IonPopover, IonContent, IonList, IonItem, IonLabel,
  alertController, toastController,
} from '@ionic/vue'
import { leafOutline, personCircleOutline, logOutOutline, cloudUploadOutline } from 'ionicons/icons'
import { useAuthStore } from '../stores/auth'
import { useSyncStore } from '../stores/sync'
import { useSync } from '../composables/useSync'

defineProps({
  title:    { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backHref: { type: String, default: '/' },
})

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

const auth   = useAuthStore()
const router = useRouter()
const sync   = useSyncStore()
const { syncAll, countPending } = useSync()

// Cargar pendientes al montar
countPending().catch(() => {})

async function handleSync() {
  const result = await syncAll()
  const t = await toastController.create({
    message: result.ok ? 'Sincronización completada' : 'Sin conexión a internet',
    duration: 2000,
    color:    result.ok ? 'success' : 'warning',
    position: 'top',
  })
  t.present()
}

const popoverOpen  = ref(false)
const popoverEvent = ref(null)

const initials = computed(() => {
  const str = auth.currentUser?.name || auth.currentUser?.email || '?'
  return str.split(/[\s@]/).map(s => s[0]).join('').toUpperCase().substring(0, 2)
})

function openPopover(e) {
  popoverEvent.value = e
  popoverOpen.value  = true
}

async function handleLogout() {
  popoverOpen.value = false
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message: '¿Estás seguro de que deseas salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Salir', role: 'destructive', handler: async () => { await auth.logout(); router.replace('/login') } },
    ],
  })
  alert.present()
}
</script>

<style scoped>
/* ── Toolbar principal ── */
.main-toolbar { --min-height: 44px; }

/* ── Sync button ── */
.sync-btn { --padding-start: 4px; --padding-end: 4px; position: relative; }
.sync-badge { position: absolute; top: 4px; right: 2px; font-size: 0.6rem; min-width: 16px; height: 16px; padding: 0 3px; }

.toolbar-center-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fff;
  text-transform: uppercase;
}
.brand-leaf { font-size: 18px; color: rgba(255,255,255,0.85); }

/* ── Avatar ── */
.avatar-btn { --padding-start: 4px; --padding-end: 2px; }
.header-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.55);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}

/* ── Hero de sección ── */
.section-hero {
  background: linear-gradient(145deg, #174437 0%, #1B4D3E 45%, #236b52 100%);
  padding: 6px 16px 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(23,68,55,0.35);
}
/* círculos decorativos de fondo */
.hero-deco-1 {
  position: absolute;
  right: -18px; top: -18px;
  width: 72px; height: 72px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  pointer-events: none;
}
.hero-deco-2 {
  position: absolute;
  right: 28px; bottom: -24px;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  pointer-events: none;
}
/* barra de acento verde claro */
.hero-accent {
  width: 4px;
  height: 26px;
  background: #5ecb90;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(94,203,144,0.5);
}
.hero-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.2);
  flex: 1;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}
.hero-actions ion-button {
  --color: #fff;
  --border-radius: 10px;
  --background: rgba(255,255,255,0.18);
  --background-hover: rgba(255,255,255,0.28);
  --padding-start: 10px;
  --padding-end: 10px;
}

/* ── Popover ── */
.popover-user-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}
.popover-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--ion-color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 700; flex-shrink: 0;
}
.popover-user-info { display: flex; flex-direction: column; overflow: hidden; }
.popover-user-info strong { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.popover-user-info small  { font-size: 0.75rem; color: var(--ion-color-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.popover-role { font-size: 0.7rem; color: var(--ion-color-primary); font-weight: 600; text-transform: capitalize; margin-top: 2px; }
.popover-list { padding: 6px 0; }
</style>
