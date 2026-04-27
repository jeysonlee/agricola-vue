<template>
  <ion-page>
    <AppHeader title="Obreros">
      <template #end>
        <ion-button @click="openForm(null)"><ion-icon slot="icon-only" :icon="addOutline" /></ion-button>
      </template>
      <template #below>
        <ion-toolbar><ion-searchbar v-model="searchText" placeholder="Buscar obrero..." /></ion-toolbar>
      </template>
    </AppHeader>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>
      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="openForm(item)">
            <ion-avatar slot="start">
              <img v-if="item.foto" :src="item.foto" :alt="item.nombre" />
              <div v-else class="avatar-placeholder">{{ initials(item.nombre) }}</div>
            </ion-avatar>
            <ion-label>
              <h2>{{ item.nombre }}</h2>
              <p>{{ item.dni || 'Sin DNI' }} — {{ item.cargo || 'Sin cargo' }}</p>
              <p v-if="item.telefono">{{ item.telefono }}</p>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminar(item)"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="peopleOutline" />
        <p>No hay obreros registrados</p>
        <ion-button @click="openForm(null)">Agregar Obrero</ion-button>
      </div>    </ion-content>

      <ion-loading :is-open="loading" message="Cargando..." />
    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <FormObreroModal :obrero="selected" @saved="onSaved" @cancel="formOpen = false" />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, IonAvatar, alertController, toastController,
} from '@ionic/vue'
import { addOutline, peopleOutline, trashOutline } from 'ionicons/icons'
import { useObreros } from '../../composables/useObreros'
import FormObreroModal from './FormObreroModal.vue'

const { getAll, eliminar } = useObreros()
const items = ref([])
const searchText = ref('')
const loading = ref(false)
const formOpen = ref(false)
const selected = ref(null)

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.nombre?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.dni?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)
function initials(nombre) { return nombre?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?' }

async function loadData() {
  if (loading.value) return
  loading.value = true
  try { items.value = await getAll() }
  catch (e) { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}
function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Obrero guardado', 'success') }
async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar', message: `¿Eliminar a "${item.nombre}"?`,
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
.avatar-placeholder {
  width: 100%; height: 100%;
  background: var(--ion-color-primary);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 1rem;
  border-radius: 50%;
}
</style>
