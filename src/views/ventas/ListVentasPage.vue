<template>
  <ion-page>
    <AppHeader title="Ventas">
      <template #end>
        <ion-button @click="openForm(null)"><ion-icon slot="icon-only" :icon="addOutline" /></ion-button>
      </template>
      <template #below>
        <ion-toolbar><ion-searchbar v-model="searchText" placeholder="Buscar venta..." /></ion-toolbar>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <ion-card v-if="items.length" color="success">
        <ion-card-content>
          <div class="total-section">
            <span>Total Ventas</span>
            <strong>S/ {{ totalVentas.toFixed(2) }}</strong>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="openForm(item)">
            <ion-icon :icon="cashOutline" slot="start" color="warning" />
            <ion-label>
              <h2>{{ item.comprador || 'Sin comprador' }}</h2>
              <p>{{ formatDate(item.fecha_venta) }}{{ item.nr_venta ? ' · #' + item.nr_venta : '' }}</p>
              <p>{{ item.cantidad_vendida_kg || item.kg_seco || 0 }} kg · S/{{ item.precio_kg || 0 }}/kg</p>
            </ion-label>
            <ion-note slot="end" color="success">S/ {{ (+item.total_venta || 0).toFixed(2) }}</ion-note>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminar(item)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="cashOutline" />
        <p>No hay ventas registradas</p>
        <ion-button @click="openForm(null)">Registrar Venta</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />

    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <FormVentaModal :venta="selected" @saved="onSaved" @cancel="formOpen = false" />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonToolbar, IonButton, IonIcon,
  IonContent, IonCard, IonCardContent, IonList, IonItem, IonItemSliding,
  IonItemOptions, IonItemOption, IonLabel, IonNote, IonSearchbar,
  IonRefresher, IonRefresherContent, IonLoading, IonModal, alertController, toastController,
} from '@ionic/vue'
import { addOutline, cashOutline, trashOutline } from 'ionicons/icons'
import { useVentas } from '../../composables/useVentas'
import { useAcceso } from '../../composables/useAcceso'
import FormVentaModal from './FormVentaModal.vue'

const { getAllByParcelas, eliminarConReversion } = useVentas()
const { getParcelaIds } = useAcceso()
const items      = ref([])
const searchText = ref('')
const loading    = ref(false)
const formOpen   = ref(false)
const selected   = ref(null)

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.comprador?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.nr_venta?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

const totalVentas = computed(() =>
  filtered.value.reduce((sum, v) => sum + (+v.total_venta || 0), 0)
)

function formatDate(d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-PE') : '—' }

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const ids = await getParcelaIds()
    items.value = await getAllByParcelas(ids)
  } catch (e) {
    showToast('Error al cargar', 'danger')
  } finally {
    loading.value = false
  }
}

function openForm(item) { selected.value = item; formOpen.value = true }

async function onSaved() {
  formOpen.value = false
  await loadData()
  showToast('Venta guardada', 'success')
}

async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar',
    message: '¿Eliminar esta venta? Se restaurará el stock de las cosechas.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Eliminar', role: 'destructive', handler: async () => {
        try {
          await eliminarConReversion(item.id)
          await loadData()
          showToast('Venta eliminada', 'warning')
        } catch (e) {
          showToast('Error: ' + e.message, 'danger')
        }
      }},
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
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: var(--ion-color-medium); gap: 12px; }
.empty-state ion-icon { font-size: 64px; }
.total-section { display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; }
.total-section strong { font-size: 1.4rem; }
</style>
