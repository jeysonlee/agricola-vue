<template>
  <ion-page>
    <AppHeader title="Cosechas">
      <template #end>
        <ion-button @click="openForm(null)"><ion-icon slot="icon-only" :icon="addOutline" /></ion-button>
      </template>
      <template #below>
        <ion-toolbar><ion-searchbar v-model="searchText" placeholder="Buscar cosecha..." /></ion-toolbar>
      </template>
    </AppHeader>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>
      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="openForm(item)">
            <ion-icon :icon="leafOutline" slot="start" color="success" />
            <ion-label>
              <h2>{{ parcelaNombre(item.parcela_id) }}</h2>
              <p>{{ formatDate(item.fecha_cosecha) }}</p>
              <p>
                <span v-if="item.kg_bruto">Bruto: {{ item.kg_bruto }} kg</span>
                <span v-if="item.kg_bruto && item.kg_seco"> · </span>
                <span v-if="item.kg_seco">Seco: {{ item.kg_seco }} kg</span>
              </p>
              <p v-if="item.observaciones">{{ item.observaciones }}</p>
            </ion-label>
            <ion-note slot="end" color="success">
              {{ item.kg_seco || item.kg_bruto || 0 }} kg
            </ion-note>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminar(item)"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="leafOutline" />
        <p>No hay cosechas registradas</p>
        <ion-button @click="openForm(null)">Registrar Cosecha</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />
    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <FormCosechaModal :cosecha="selected" :parcelas="parcelas" @saved="onSaved" @cancel="formOpen = false" />
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
  IonLabel, IonNote, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, alertController, toastController,
} from '@ionic/vue'
import { addOutline, leafOutline, trashOutline } from 'ionicons/icons'
import { useCosechas } from '../../composables/useCosechas'
import { useParcelas } from '../../composables/useParcelas'
import { useAcceso }   from '../../composables/useAcceso'
import FormCosechaModal from './FormCosechaModal.vue'

const { getAllByParcelas, eliminar } = useCosechas()
const { getAll: getParcelas }       = useParcelas()
const { getParcelaIds }             = useAcceso()
const items      = ref([])
const parcelas   = ref([])
const searchText = ref('')
const loading    = ref(false)
const formOpen   = ref(false)
const selected   = ref(null)

const filtered = computed(() =>
  items.value.filter(i => !searchText.value || parcelaNombre(i.parcela_id).toLowerCase().includes(searchText.value.toLowerCase()))
)
function parcelaNombre(id) { return parcelas.value.find(p => p.id === id)?.nombre || '-' }
function formatDate(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE') : '-' }

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const [ids, p] = await Promise.all([getParcelaIds(), getParcelas()])
    parcelas.value = p
    items.value = await getAllByParcelas(ids)
  } catch (e) { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}
function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Cosecha guardada', 'success') }
async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar', message: '¿Eliminar esta cosecha?',
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
</style>
