<template>
  <ion-page>
    <AppHeader title="Usuarios">
      <template #end>
        <ion-button @click="openForm(null)"><ion-icon slot="icon-only" :icon="addOutline" /></ion-button>
      </template>
      <template #below>
        <ion-toolbar><ion-searchbar v-model="searchText" placeholder="Buscar usuario..." /></ion-toolbar>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <div v-if="!loading && filtered.length" class="list-card">
        <ion-list lines="none">
          <ion-item-sliding v-for="item in filtered" :key="item.id">
            <ion-item button detail @click="openForm(item)">
              <!-- Avatar con iniciales -->
              <div slot="start" :class="['item-avatar', `av-${roleColor(item.role)}`]">
                <span class="av-initials">{{ initials(item) }}</span>
              </div>
              <ion-label>
                <h3>{{ userDisplayName(item) || item.email }}</h3>
                <p>{{ item.email }}</p>
                <p>{{ capitalize(item.role || 'usuario') }} · {{ capitalize(item.status || 'activo') }}</p>
              </ion-label>
              <div slot="end" class="item-end">
                <ion-badge :color="roleColor(item.role)" class="role-badge">{{ item.role || 'user' }}</ion-badge>
              </div>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option
                color="danger"
                :disabled="item.id === auth.currentUser?.id"
                @click="confirmarEliminar(item)"
              >
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="personOutline" class="empty-icon" />
        <h3>Sin usuarios</h3>
        <p>No hay usuarios registrados aún</p>
        <ion-button @click="openForm(null)">Agregar Usuario</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />
    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <UsersFormModal :usuario="selected" @saved="onSaved" @cancel="formOpen = false" />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonToolbar, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonLabel, IonBadge, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, alertController, toastController,
} from '@ionic/vue'
import { addOutline, personOutline, trashOutline } from 'ionicons/icons'
import { useUsers } from '../../composables/useUsers'
import { useAuthStore } from '../../stores/auth'
import UsersFormModal from './UsersFormModal.vue'

const { getAll, eliminar } = useUsers()
const auth = useAuthStore()
const items      = ref([])
const searchText = ref('')
const loading    = ref(false)
const formOpen   = ref(false)
const selected   = ref(null)

function userDisplayName(u) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
  return full || u.username || u.email || ''
}

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    userDisplayName(i).toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.email?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

function initials(u) {
  const name = userDisplayName(u)
  return name.split(/[\s@]/).map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'
}

function roleColor(role) {
  const r = role?.toLowerCase()
  if (r === 'superadmin') return 'danger'
  if (r === 'admin')      return 'warning'
  if (r === 'tecnico')    return 'tertiary'
  return 'primary'
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : '' }

async function loadData() {
  if (loading.value) return
  loading.value = true
  try { items.value = await getAll() }
  catch { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}

function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Usuario guardado', 'success') }

async function confirmarEliminar(item) {
  if (item.id === auth.currentUser?.id) return
  const alert = await alertController.create({
    header: 'Eliminar',
    message: `¿Eliminar usuario "${userDisplayName(item) || item.email}"?`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Eliminar', role: 'destructive', handler: async () => { await eliminar(item.id); await loadData(); showToast('Eliminado', 'warning') } },
    ],
  })
  alert.present()
}

async function onRefresh(ev) { await loadData(); ev.target.complete() }
async function showToast(message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2000, color, position: 'top' }); t.present()
}

onIonViewWillEnter(loadData)
onMounted(loadData)
</script>

<style scoped>
.list-card {
  margin: 8px 12px 16px;
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 1px 8px rgba(0,0,0,.08);
  background: var(--ion-item-background, #fff);
}
.list-card ion-list { padding: 0; background: transparent; }
ion-item {
  --padding-start: 14px; --inner-padding-end: 6px;
  --min-height: 72px; --background: transparent;
  --border-color: rgba(0,0,0,.06);
  --detail-icon-color: var(--ion-color-medium); --detail-icon-font-size: 14px;
}
ion-label h3 { font-size: 15px !important; font-weight: 700 !important; color: var(--ion-color-dark) !important; margin-bottom: 2px !important; }
ion-label p  { font-size: 13px !important; color: var(--ion-color-medium-shade) !important; margin: 0 !important; }

/* Avatar con iniciales */
.item-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 4px;
}
.av-initials { font-size: 16px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -.5px; }

.av-primary  { background: var(--ion-color-primary); }
.av-warning  { background: #d97706; }
.av-danger   { background: var(--ion-color-danger); }
.av-tertiary { background: var(--ion-color-tertiary); }

.item-end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.role-badge { font-size: 11px; padding: 3px 8px; border-radius: 20px; text-transform: capitalize; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 64px 28px; text-align: center;
}
.empty-icon { font-size: 56px; color: var(--ion-color-medium); opacity: .4; }
.empty-state h3 { font-size: 18px; font-weight: 700; color: var(--ion-color-dark); margin: 0; }
.empty-state p  { font-size: 14px; color: var(--ion-color-medium); margin: 0; }
</style>
