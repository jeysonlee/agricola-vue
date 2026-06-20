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

      <div v-if="!loading && filtered.length" class="list-card">
        <ion-list lines="none">
          <ion-item-sliding v-for="item in filtered" :key="item.id">
            <ion-item button detail @click="openForm(item)">
              <div slot="start" class="item-avatar av-success">
                <ion-icon :icon="leafOutline" />
              </div>
              <ion-label>
                <h3>{{ parcelaNombre(item.parcela_id) }}</h3>
                <p>{{ formatDate(item.fecha_cosecha) }}</p>
                <p>
                  <span v-if="item.kg_bruto">Bruto: {{ item.kg_bruto }} kg</span>
                  <span v-if="item.kg_bruto && item.kg_seco"> · </span>
                  <span v-if="item.kg_seco">Seco: {{ item.kg_seco }} kg</span>
                </p>
              </ion-label>
              <div slot="end" class="item-end">
                <span class="end-val end-green">{{ item.kg_seco || item.kg_bruto || 0 }}</span>
                <span class="end-sub">kg</span>
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
        <ion-icon :icon="leafOutline" class="empty-icon" />
        <h3>Sin cosechas</h3>
        <p>No hay cosechas registradas aún</p>
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
  IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
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
function parcelaNombre(id) { return parcelas.value.find(p => p.id === id)?.nombre || '—' }
function formatDate(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE') : '—' }

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const [ids, p] = await Promise.all([getParcelaIds(), getParcelas()])
    parcelas.value = p
    items.value = await getAllByParcelas(ids)
  } catch { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}
function openForm(item) { selected.value = item; formOpen.value = true }
async function onSaved() { formOpen.value = false; await loadData(); showToast('Cosecha guardada', 'success') }
async function confirmarEliminar(item) {
  const alert = await alertController.create({
    header: 'Eliminar', message: '¿Eliminar esta cosecha?',
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
.item-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 4px;
}
.item-avatar ion-icon { font-size: 22px; color: #fff; }
.av-success { background: var(--ion-color-success); }
.item-end   { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.end-val    { font-size: 16px; font-weight: 700; color: var(--ion-color-dark); }
.end-green  { color: var(--ion-color-success); }
.end-sub    { font-size: 11px; color: var(--ion-color-medium); }
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 64px 28px; text-align: center;
}
.empty-icon { font-size: 56px; color: var(--ion-color-medium); opacity: .4; }
.empty-state h3 { font-size: 18px; font-weight: 700; color: var(--ion-color-dark); margin: 0; }
.empty-state p  { font-size: 14px; color: var(--ion-color-medium); margin: 0; }
</style>
