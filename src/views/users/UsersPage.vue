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
      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="openForm(item)">
            <ion-avatar slot="start">
              <div class="avatar-placeholder">{{ initials(item) }}</div>
            </ion-avatar>
            <ion-label>
              <h2>{{ userDisplayName(item) || item.email }}</h2>
              <p>{{ item.email }}</p>
              <p>Rol: {{ item.role || 'user' }}</p>
            </ion-label>
            <ion-badge :color="item.role === 'admin' ? 'danger' : 'primary'" slot="end">{{ item.role || 'user' }}</ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminar(item)" :disabled="item.id === auth.currentUser?.id">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="personOutline" />
        <p>No hay usuarios registrados</p>
        <ion-button @click="openForm(null)">Agregar Usuario</ion-button>
      </div>    </ion-content>

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
  IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, IonAvatar, IonBadge, alertController, toastController,
} from '@ionic/vue'
import { addOutline, personOutline, trashOutline } from 'ionicons/icons'
import { useUsers } from '../../composables/useUsers'
import { useAuthStore } from '../../stores/auth'
import UsersFormModal from './UsersFormModal.vue'

const { getAll, eliminar } = useUsers()
const auth = useAuthStore()
const items = ref([])
const searchText = ref('')
const loading = ref(false)
const formOpen = ref(false)
const selected = ref(null)

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

async function loadData() {
  if (loading.value) return
  loading.value = true
  try { items.value = await getAll() }
  catch (e) { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}
function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Usuario guardado', 'success') }
async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar', message: `¿Eliminar usuario "${userDisplayName(item) || item.email}"?`,
    buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive', handler: async () => { await eliminar(item.id); await loadData(); showToast('Eliminado', 'warning') } }],
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
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: var(--ion-color-medium); gap: 12px; }
.empty-state ion-icon { font-size: 64px; }
.avatar-placeholder { width: 100%; height: 100%; background: var(--ion-color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; border-radius: 50%; }
</style>
