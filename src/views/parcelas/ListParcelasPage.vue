<template>
  <ion-page>
    <AppHeader title="Parcelas">
      <template #end>
        <ion-button @click="openForm(null)">
          <ion-icon slot="icon-only" :icon="addOutline" />
        </ion-button>
      </template>
      <template #below>
        <ion-toolbar>
          <ion-searchbar v-model="searchText" placeholder="Buscar parcela..." />
        </ion-toolbar>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="openForm(item)">
            <ion-icon :icon="mapOutline" slot="start" color="primary" />
            <ion-label>
              <h2>{{ item.nombre }}</h2>
              <p>{{ item.ubicacion }} — {{ item.cultivo }}</p>
              <p>{{ item.area }} ha</p>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminar(item)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="mapOutline" />
        <p>No hay parcelas registradas</p>
        <ion-button @click="openForm(null)">Agregar Parcela</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />

    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <FormParcelaModal
        :parcela="selected"
        :is-superadmin="isSuperadmin"
        :usuarios="usuarios"
        :current-user-id="auth.currentUser?.id || ''"
        @saved="onSaved"
        @cancel="formOpen = false"
      />
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
  IonModal, alertController, toastController,
} from '@ionic/vue'
import { addOutline, mapOutline, trashOutline } from 'ionicons/icons'
import { useParcelas } from '../../composables/useParcelas'
import { useUsers } from '../../composables/useUsers'
import { useAuthStore } from '../../stores/auth'
import FormParcelaModal from './FormParcelaModal.vue'

const { getAll, getAllPorUsuario, eliminar } = useParcelas()
const { getAll: getUsuarios } = useUsers()
const auth = useAuthStore()

const items     = ref([])
const usuarios  = ref([])
const searchText = ref('')
const loading   = ref(false)
const formOpen  = ref(false)
const selected  = ref(null)

const isSuperadmin = computed(() => {
  const role = auth.currentUser?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin'
})

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.nombre?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.ubicacion?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.cultivo?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    if (isSuperadmin.value) {
      // Admin ve todas las parcelas y carga la lista de usuarios para asignar
      const [parcelas, users] = await Promise.all([getAll(), getUsuarios()])
      items.value    = parcelas
      usuarios.value = users
    } else {
      // Usuario normal solo ve sus parcelas
      items.value = await getAllPorUsuario(auth.currentUser?.id)
    }
  } catch (e) {
    showToast('Error al cargar parcelas', 'danger')
  } finally {
    loading.value = false
  }
}

function openForm(item) {
  selected.value = item
  formOpen.value = true
}

async function onSaved() {
  formOpen.value = false
  await loadData()
  showToast('Parcela guardada correctamente', 'success')
}

async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar Parcela',
    message: `¿Eliminar "${item.nombre}"? También se eliminará su asignación de usuarios.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: async () => {
          try {
            await eliminar(item.id)
            await loadData()
            showToast('Parcela eliminada', 'warning')
          } catch (e) {
            showToast('Error: ' + e.message, 'danger')
          }
        },
      },
    ],
  })
  alert.present()
}

async function onRefresh(ev) { await loadData(); ev.target.complete() }

async function showToast(message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2000, color, position: 'top' })
  t.present()
}

onIonViewWillEnter(loadData)
onMounted(loadData)
</script>

<style scoped>
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 60vh;
  color: var(--ion-color-medium); gap: 12px;
}
.empty-state ion-icon { font-size: 64px; }
</style>
