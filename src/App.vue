<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="md">

      <!-- ── SIDEBAR (solo cuando autenticado) ── -->
      <ion-menu content-id="main-content" type="overlay" v-if="auth.isAuthenticated">
        <ion-header>
          <ion-toolbar color="primary">
            <div class="sidebar-brand">
              <ion-icon :icon="leafOutline" class="brand-icon" />
              <span class="brand-name">Agrícola</span>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="sidebar-content">
          <!-- Info del usuario -->
          <div class="user-info">
            <div class="user-avatar">{{ initials }}</div>
            <div class="user-details">
              <strong>{{ auth.displayName || auth.currentUser?.email }}</strong>
              <small>{{ auth.currentUser?.role || 'usuario' }}</small>
            </div>
          </div>

          <ion-list lines="none" class="nav-list">
            <ion-menu-toggle :auto-hide="false" v-for="item in navItems" :key="item.path">
              <ion-item
                button
                :router-link="item.path"
                router-direction="root"
                :class="{ 'nav-active': isActive(item.path) }"
                class="nav-item"
              >
                <ion-icon :icon="item.icon" slot="start" :color="isActive(item.path) ? 'primary' : 'medium'" />
                <ion-label>{{ item.label }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
        </ion-content>

        <ion-footer class="sidebar-footer">
          <ion-item button lines="none" class="logout-item" @click="handleLogout">
            <ion-icon :icon="logOutOutline" slot="start" color="danger" />
            <ion-label color="danger">Cerrar sesión</ion-label>
          </ion-item>
        </ion-footer>
      </ion-menu>

      <!-- ── CONTENIDO PRINCIPAL ── -->
      <ion-page id="main-content">
        <ion-router-outlet />
      </ion-page>

    </ion-split-pane>
  </ion-app>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonApp, IonSplitPane, IonMenu, IonMenuToggle,
  IonPage, IonRouterOutlet,
  IonHeader, IonToolbar, IonContent, IonFooter,
  IonList, IonItem, IonLabel, IonIcon,
  alertController, toastController,
} from '@ionic/vue'
import {
  leafOutline, homeOutline, mapOutline, clipboardOutline,
  cashOutline, personOutline, logOutOutline,
} from 'ionicons/icons'
import { useAuthStore } from './stores/auth'
import { useTareas }    from './composables/useTareas'
import { useParcelas }  from './composables/useParcelas'
import { useAcceso }    from './composables/useAcceso'
import { clasificarTareas, generarNotificacionesDeTareas, useNotificaciones } from './composables/useNotificaciones'
import { useNotificacionesStore } from './stores/notificaciones'

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()
const { getAllByParcelas }                          = useTareas()
const { getAll: getParcelas }                      = useParcelas()
const { getParcelaIds }                            = useAcceso()
const { sincronizarNotificaciones, notificarOverdueNativo } = useNotificaciones()
const notifStore                                   = useNotificacionesStore()

let startupDone = false

async function verificarTareasAlInicio() {
  if (startupDone || !auth.isAuthenticated) return
  startupDone = true
  try {
    const [ids, parcelas] = await Promise.all([getParcelaIds(), getParcelas()])
    const tareas     = await getAllByParcelas(ids)
    const parcelaMap = Object.fromEntries(parcelas.map(p => [p.id, p.nombre]))
    const grupos     = clasificarTareas(tareas)

    // Poblar store de notificaciones (bell icon en header)
    notifStore.setNotificaciones(generarNotificacionesDeTareas(tareas, parcelaMap))

    // Re-sincronizar alarmas nativas programadas
    sincronizarNotificaciones(tareas)

    // Notificación nativa inmediata para vencidas (1 vez/día)
    notificarOverdueNativo(grupos, notifStore)

    const total = grupos.vencidas.length + grupos.hoy.length + grupos.manana.length + grupos.semana.length
    if (!total) return

    const partes = []
    if (grupos.vencidas.length) partes.push(`${grupos.vencidas.length} vencida${grupos.vencidas.length > 1 ? 's' : ''}`)
    if (grupos.hoy.length)      partes.push(`${grupos.hoy.length} para hoy`)
    if (grupos.manana.length)   partes.push(`${grupos.manana.length} para mañana`)
    if (grupos.semana.length)   partes.push(`${grupos.semana.length} esta semana`)

    const t = await toastController.create({
      message: `Tareas: ${partes.join(' · ')}`,
      duration: 4000,
      color:    grupos.vencidas.length || grupos.hoy.length ? 'danger' : 'warning',
      position: 'top',
      buttons:  [{ text: 'Ver', handler: () => router.push('/tabs/tareas') }],
    })
    t.present()
  } catch (_) {}
}

watch(() => auth.isAuthenticated, (val) => { if (val) verificarTareasAlInicio() }, { immediate: true })
onMounted(() => { if (auth.isAuthenticated) verificarTareasAlInicio() })

const initials = computed(() => {
  const str = auth.displayName || auth.currentUser?.email || '?'
  return str.split(/[\s@]/).map(s => s[0]).join('').toUpperCase().substring(0, 2)
})

const navItems = computed(() => {
  const items = [
    { label: 'Inicio',   path: '/tabs/home',     icon: homeOutline },
    { label: 'Parcelas', path: '/tabs/parcelas', icon: mapOutline },
    { label: 'Tareas',   path: '/tabs/tareas',   icon: clipboardOutline },
    { label: 'Cosechas', path: '/tabs/cosechas', icon: leafOutline },
    { label: 'Ventas',   path: '/tabs/ventas',   icon: cashOutline },
  ]
  if (auth.isAdmin) items.push({ label: 'Usuarios', path: '/tabs/users', icon: personOutline })
  return items
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message: '¿Estás seguro de que deseas salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Salir', role: 'destructive',
        handler: async () => {
          await auth.logout()
          router.replace('/login')
        },
      },
    ],
  })
  alert.present()
}
</script>

<style>
/* ── Sidebar brand ── */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
}
.brand-icon  { font-size: 28px; color: #fff; }
.brand-name  { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; }

/* ── User info ── */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--ion-color-light-shade);
  margin-bottom: 8px;
}
.user-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1rem;
  flex-shrink: 0;
}
.user-details { display: flex; flex-direction: column; overflow: hidden; }
.user-details strong { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-details small  { font-size: 0.75rem; color: var(--ion-color-medium); text-transform: capitalize; }

/* ── Nav items ── */
.nav-list    { padding: 0 8px; }
.nav-item    { --border-radius: 8px; margin-bottom: 2px; --min-height: 46px; }
.nav-active  { --background: rgba(var(--ion-color-primary-rgb), 0.12); font-weight: 600; }
.nav-active ion-label { color: var(--ion-color-primary) !important; font-weight: 600; }

/* ── Footer logout ── */
.sidebar-footer { border-top: 1px solid var(--ion-color-light-shade); }
.logout-item    { --min-height: 50px; }

/* ── Web: ocultar bottom tabs cuando el splitpane está activo ── */
@media (min-width: 768px) {
  ion-tab-bar { display: none !important; }
}

/* ── Searchbar: fondo blanco con sombra sutil ── */
ion-header ion-toolbar:has(ion-searchbar) {
  --background: #1B4D3E;
  --border-color: transparent;
  padding-bottom: 4px;
}
ion-header ion-toolbar:has(ion-searchbar) ion-searchbar {
  --background: transparent;
  --color: #fff;
  --placeholder-color: rgba(255,255,255,0.55);
  --icon-color: rgba(255,255,255,0.7);
  --clear-button-color: rgba(255,255,255,0.7);
  --border-radius: 10px;
  --box-shadow: none;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}
</style>
