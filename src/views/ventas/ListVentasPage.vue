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

      <!-- Tarjeta resumen total -->
      <div v-if="filtered.length" class="total-card">
        <div class="total-left">
          <span class="total-label">Total ventas</span>
          <span class="total-count">{{ filtered.length }} registro{{ filtered.length !== 1 ? 's' : '' }}</span>
        </div>
        <span class="total-monto">S/ {{ totalVentas.toFixed(2) }}</span>
      </div>

      <div v-if="!loading && filtered.length" class="list-card">
        <ion-list lines="none">
          <ion-item-sliding v-for="item in filtered" :key="item.id">
            <ion-item button detail @click="openForm(item)">
              <div slot="start" class="item-avatar av-warning">
                <ion-icon :icon="cashOutline" />
              </div>
              <ion-label>
                <h3>{{ item.comprador || 'Sin comprador' }}</h3>
                <p>{{ formatDate(item.fecha_venta) }}{{ item.nr_venta ? ' · #' + item.nr_venta : '' }}</p>
                <p>{{ item.cantidad_vendida_kg || item.kg_seco || 0 }} kg · S/{{ item.precio_kg || 0 }}/kg</p>
              </ion-label>
              <div slot="end" class="item-end">
                <span class="end-val end-green">S/ {{ (+item.total_venta || 0).toFixed(2) }}</span>
              </div>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="confirmarEliminar(item)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="cashOutline" class="empty-icon" />
        <h3>Sin ventas</h3>
        <p>No hay ventas registradas aún</p>
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
  IonContent, IonList, IonItem, IonItemSliding,
  IonItemOptions, IonItemOption, IonLabel, IonSearchbar,
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
  } catch { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}

function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Venta guardada', 'success') }

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
        } catch (e) { showToast('Error: ' + e.message, 'danger') }
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
/* ── Total card ── */
.total-card {
  display: flex; align-items: center; justify-content: space-between;
  margin: 12px 12px 0; padding: 14px 18px;
  background: linear-gradient(135deg, var(--ion-color-success) 0%, #2e7d32 100%);
  border-radius: 14px; color: #fff;
}
.total-left   { display: flex; flex-direction: column; gap: 2px; }
.total-label  { font-size: 12px; opacity: .85; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.total-count  { font-size: 12px; opacity: .7; }
.total-monto  { font-size: 22px; font-weight: 800; }

/* ── List design ── */
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
.item-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 4px;
}
.item-avatar ion-icon { font-size: 22px; color: #fff; }
.av-warning { background: #d97706; }
.item-end   { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.end-val    { font-size: 15px; font-weight: 700; color: var(--ion-color-dark); }
.end-green  { color: var(--ion-color-success); }
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 64px 28px; text-align: center;
}
.empty-icon { font-size: 56px; color: var(--ion-color-medium); opacity: .4; }
.empty-state h3 { font-size: 18px; font-weight: 700; color: var(--ion-color-dark); margin: 0; }
.empty-state p  { font-size: 14px; color: var(--ion-color-medium); margin: 0; }
</style>
