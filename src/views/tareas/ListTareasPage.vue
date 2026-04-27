<template>
  <ion-page>
    <AppHeader title="Tareas">
      <template #end>
        <ion-button router-link="/tabs/tareas/nueva">
          <ion-icon slot="icon-only" :icon="addOutline" />
        </ion-button>
      </template>
      <template #below>
        <ion-toolbar>
          <ion-searchbar v-model="searchText" placeholder="Buscar tarea..." />
        </ion-toolbar>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list v-if="!loading && filtered.length">
        <ion-item-sliding v-for="item in filtered" :key="item.id">
          <ion-item button @click="verDetalle(item)">
            <ion-icon :icon="clipboardOutline" slot="start" :color="statusColor(item.estado)" />
            <ion-label>
              <h2>{{ item.descripcion }}</h2>
              <p>{{ item.tipo_tarea || item.tipo_tarea_nombre || '-' }} — {{ parcelaNombre(item.parcela_id) }}</p>
              <p>{{ formatDate(item.fecha_inicio) }}</p>
            </ion-label>
            <ion-badge :color="statusColor(item.estado)" slot="end">{{ item.estado }}</ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="primary" :router-link="`/tabs/tareas/${item.id}/editar`">
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-item-option>
            <ion-item-option color="danger" @click="confirmarEliminar(item)" :disabled="isCosecha(item)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="clipboardOutline" />
        <p>No hay tareas registradas</p>
        <ion-button router-link="/tabs/tareas/nueva">Agregar Tarea</ion-button>
      </div>

    </ion-content>
    <ion-loading :is-open="loading" message="Cargando..." />

    <!-- Detalle modal -->
    <ion-modal :is-open="detalleOpen" @didDismiss="detalleOpen = false" :breakpoints="[0, 0.7]" :initial-breakpoint="0.7">
      <ion-header>
        <ion-toolbar>
          <ion-title>Detalle de Tarea</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="detalleOpen = false">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="selected">
        <ion-list>
          <ion-item>
            <ion-label><strong>Descripción:</strong> {{ selected.descripcion }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label><strong>Tipo:</strong> {{ selected.tipo_tarea || selected.tipo_tarea_nombre || '-' }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label><strong>Parcela:</strong> {{ parcelaNombre(selected.parcela_id) }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label><strong>Estado:</strong>
              <ion-badge :color="statusColor(selected.estado)" class="ion-margin-start">{{ selected.estado }}</ion-badge>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label><strong>Fecha Inicio:</strong> {{ formatDate(selected.fecha_inicio) }}</ion-label>
          </ion-item>
          <ion-item v-if="selected.fecha_fin">
            <ion-label><strong>Fecha Fin:</strong> {{ formatDate(selected.fecha_fin) }}</ion-label>
          </ion-item>
          <ion-item v-if="selected.observaciones">
            <ion-label class="ion-text-wrap"><strong>Observaciones:</strong> {{ selected.observaciones }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, IonBadge, alertController, toastController,
} from '@ionic/vue'
import { addOutline, clipboardOutline, createOutline, trashOutline, closeOutline } from 'ionicons/icons'
import { useTareas } from '../../composables/useTareas'
import { useParcelas } from '../../composables/useParcelas'

const { getAll, eliminar } = useTareas()
const { getAll: getParcelas } = useParcelas()

const items = ref([])
const parcelas = ref([])
const searchText = ref('')
const loading = ref(false)
const detalleOpen = ref(false)
const selected = ref(null)

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.descripcion?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.tipo_tarea?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

function parcelaNombre(id) { return parcelas.value.find(p => p.id === id)?.nombre || '-' }
function isCosecha(item) { return item.tipo_tarea?.toLowerCase().includes('cosecha') }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-PE') : '-' }
function statusColor(estado) {
  const map = { pendiente: 'warning', 'en progreso': 'primary', completada: 'success', cancelada: 'danger' }
  return map[estado?.toLowerCase()] || 'medium'
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const [p, it] = await Promise.all([getParcelas(), getAll()])
    parcelas.value = p; items.value = it
  } catch (e) { showToast('Error al cargar', 'danger') }
  finally { loading.value = false }
}

function verDetalle(item) { selected.value = item; detalleOpen.value = true }

async function confirmarEliminar(item) {
  if (isCosecha(item)) return showToast('No se puede eliminar una tarea de cosecha', 'warning')
  const alert = await alertController.create({
    header: 'Eliminar Tarea',
    message: `¿Eliminar "${item.descripcion}"?`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Eliminar', role: 'destructive', handler: async () => { await eliminar(item.id); await loadData(); showToast('Tarea eliminada', 'warning') } },
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
</style>
