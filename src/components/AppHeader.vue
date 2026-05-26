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

      <!-- Derecha: sync + notificaciones + avatar -->
      <ion-buttons slot="end">
        <slot v-if="showBack" name="end" />
        <ion-button v-if="isNative" fill="clear" @click="handleSync" :disabled="sync.syncing" class="sync-btn" title="Sincronizar">
          <ion-icon v-if="!sync.syncing" :icon="cloudUploadOutline" color="light" />
          <ion-spinner v-else name="crescent" color="light" style="width:18px;height:18px" />
          <ion-badge v-if="sync.pendingCount > 0 && !sync.syncing" color="warning" class="sync-badge">
            {{ sync.pendingCount > 99 ? '99+' : sync.pendingCount }}
          </ion-badge>
        </ion-button>
        <ion-button fill="clear" class="bell-btn" @click="notifOpen = true" title="Notificaciones">
          <ion-icon :icon="notificationsOutline" color="light" />
          <ion-badge v-if="notifStore.unreadCount > 0" color="danger" class="notif-badge">
            {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
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

  <!-- ── Panel de notificaciones ── -->
  <Teleport to="body">
    <ion-modal
      :is-open="notifOpen"
      @didDismiss="notifOpen = false"
      :breakpoints="[0, 0.7, 0.95]"
      :initial-breakpoint="0.7"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>
            Notificaciones
            <ion-badge v-if="notifStore.unreadCount > 0" color="danger" style="margin-left:6px;font-size:0.7rem">
              {{ notifStore.unreadCount }}
            </ion-badge>
          </ion-title>
          <ion-buttons slot="end">
            <ion-button v-if="notifStore.noLeidas.length" fill="clear" size="small" @click="notifStore.marcarTodasLeidas()">
              Leer todo
            </ion-button>
            <ion-button fill="clear" @click="notifOpen = false">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list v-if="notifStore.lista.length" lines="full">
          <ion-item
            v-for="n in notifStore.lista"
            :key="n.id"
            button
            :class="{ 'notif-leida': !notifStore.noLeidas.find(x => x.id === n.id) }"
            @click="abrirNotif(n)"
          >
            <div slot="start" class="notif-dot" :class="`dot-${n.color}`" />
            <ion-label>
              <h3 class="notif-titulo">{{ n.titulo }}</h3>
              <p v-if="n.parcela">{{ n.parcela }}</p>
              <p v-if="n.fecha">{{ formatNotifDate(n.fecha) }}</p>
            </ion-label>
            <ion-badge :color="n.color" slot="end" class="notif-label-badge">
              {{ n.label }}
            </ion-badge>
          </ion-item>
        </ion-list>
        <div v-else class="notif-empty">
          <ion-icon :icon="checkmarkCircleOutline" color="success" />
          <p>Sin notificaciones pendientes</p>
        </div>
      </ion-content>
    </ion-modal>
  </Teleport>

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
            <strong>{{ auth.displayName || auth.currentUser?.email }}</strong>
            <small>{{ auth.currentUser?.email }}</small>
            <span class="popover-role">{{ auth.currentUser?.role || 'usuario' }}</span>
          </div>
        </div>
        <ion-list lines="none" class="popover-list">
          <ion-item button lines="none" @click="irAlPerfil">
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
  IonPopover, IonModal, IonContent, IonList, IonItem, IonLabel,
  alertController, toastController,
} from '@ionic/vue'
import {
  leafOutline, personCircleOutline, logOutOutline, cloudUploadOutline,
  notificationsOutline, closeOutline, checkmarkCircleOutline,
} from 'ionicons/icons'
import { useAuthStore }           from '../stores/auth'
import { useSyncStore }           from '../stores/sync'
import { useSync }                from '../composables/useSync'
import { useNotificacionesStore } from '../stores/notificaciones'

defineProps({
  title:    { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backHref: { type: String, default: '/' },
})

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

const auth       = useAuthStore()
const router     = useRouter()
const sync       = useSyncStore()
const notifStore = useNotificacionesStore()
const { syncAll, countPending } = useSync()

countPending().catch(() => {})

async function handleSync() {
  const result = await syncAll()
  if (!result) return
  const message = result.ok
    ? 'Sincronización completada'
    : (result.reason || 'Error al sincronizar')
  const t = await toastController.create({
    message,
    duration: 3000,
    color:    result.ok ? 'success' : 'warning',
    position: 'top',
  })
  t.present()
}

// ── Notificaciones ──
const notifOpen = ref(false)

function formatNotifDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function abrirNotif(n) {
  notifStore.marcarLeida(n.id)
  notifOpen.value = false
  router.push('/tabs/tareas')
}

const popoverOpen  = ref(false)
const popoverEvent = ref(null)

const initials = computed(() => {
  const str = auth.displayName || auth.currentUser?.email || '?'
  return str.split(/[\s@]/).map(s => s[0]).join('').toUpperCase().substring(0, 2)
})

function irAlPerfil() {
  popoverOpen.value = false
  router.push('/tabs/perfil')
}

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

/* ── Bell button ── */
.bell-btn { --padding-start: 4px; --padding-end: 4px; position: relative; }
.notif-badge { position: absolute; top: 4px; right: 2px; font-size: 0.55rem; min-width: 15px; height: 15px; padding: 0 3px; border-radius: 8px; }

/* ── Notification panel ── */
.notif-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  margin-right: 4px;
}
.dot-danger  { background: var(--ion-color-danger); }
.dot-warning { background: var(--ion-color-warning); }
.dot-medium  { background: var(--ion-color-medium); }

.notif-titulo { font-weight: 600; font-size: 0.9rem; }
.notif-label-badge { font-size: 0.65rem; padding: 3px 7px; }

.notif-leida { opacity: 0.5; }

.notif-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 30vh;
  gap: 10px; color: var(--ion-color-medium);
}
.notif-empty ion-icon { font-size: 52px; }
.notif-empty p { font-size: 0.9rem; margin: 0; }
</style>
