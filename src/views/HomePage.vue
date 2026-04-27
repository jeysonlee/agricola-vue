<template>
  <ion-page>
    <AppHeader title="Inicio">
      <template #end>
        <ion-button @click="loadData">
          <ion-icon slot="icon-only" :icon="refreshOutline" />
        </ion-button>
      </template>
    </AppHeader>

    <ion-content class="ion-padding">
      <div class="welcome-section">
        <h2>Bienvenido</h2>
        <p>{{ auth.currentUser?.name || auth.currentUser?.email || 'Usuario' }}</p>
      </div>

      <ion-grid>
        <ion-row>
          <ion-col size="6" v-for="card in summaryCards" :key="card.label">
            <ion-card class="summary-card" :router-link="card.route" button>
              <ion-card-content>
                <ion-icon :icon="card.icon" :color="card.color" class="card-icon" />
                <div class="card-count">{{ card.count }}</div>
                <div class="card-label">{{ card.label }}</div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Tareas Recientes</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list v-if="recentTareas.length">
            <ion-item v-for="tarea in recentTareas" :key="tarea.id" lines="full">
              <ion-icon :icon="clipboardOutline" slot="start" color="primary" />
              <ion-label>
                <h3>{{ tarea.descripcion }}</h3>
                <p>{{ tarea.tipo_nombre }} — {{ tarea.parcela_nombre }}</p>
              </ion-label>
              <ion-badge :color="statusColor(tarea.estado)" slot="end">{{ tarea.estado }}</ion-badge>
            </ion-item>
          </ion-list>
          <p v-else class="ion-text-center" style="color: var(--ion-color-medium)">Sin tareas recientes</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import {
  IonPage, IonContent, IonButtons, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader,
  IonCardTitle, IonList, IonItem, IonLabel, IonBadge,
} from '@ionic/vue'
import {
  refreshOutline, mapOutline, clipboardOutline,
  peopleOutline, leafOutline, cashOutline,
} from 'ionicons/icons'
import { useAuthStore } from '../stores/auth'
import { useSupabase } from '../composables/useSupabase'

const auth = useAuthStore()
const { readAll } = useSupabase()

const recentTareas = ref([])
const summaryCards = ref([
  { label: 'Parcelas', icon: mapOutline, color: 'primary', route: '/tabs/parcelas', key: 'parcelas', count: 0 },
  { label: 'Tareas', icon: clipboardOutline, color: 'warning', route: '/tabs/tareas', key: 'tareas', count: 0 },
  { label: 'Obreros', icon: peopleOutline, color: 'success', route: '/tabs/obreros', key: 'obreros', count: 0 },
  { label: 'Cosechas', icon: leafOutline, color: 'medium', route: '/tabs/cosechas', key: 'cosechas', count: 0 },
  { label: 'Ventas', icon: cashOutline, color: 'danger', route: '/tabs/ventas', key: 'ventas', count: 0 },
])

async function loadData() {
  try {
    const tables = ['parcelas', 'tareas', 'obreros', 'cosechas', 'ventas']
    const results = await Promise.allSettled(tables.map(t => readAll(t)))
    tables.forEach((t, i) => {
      const card = summaryCards.value.find(c => c.key === t)
      if (card && results[i].status === 'fulfilled') card.count = results[i].value.length
    })

    const [tareasData, tiposData, parcelasData] = await Promise.allSettled([
      readAll('tareas'), readAll('tipos_tarea'), readAll('parcelas'),
    ])
    const tareas = tareasData.status === 'fulfilled' ? tareasData.value : []
    const tipos = tiposData.status === 'fulfilled' ? tiposData.value : []
    const parcelas = parcelasData.status === 'fulfilled' ? parcelasData.value : []

    recentTareas.value = tareas.slice(0, 5).map(t => ({
      ...t,
      tipo_nombre: tipos.find(tt => tt.id === t.tipo_tarea_id)?.nombre || '-',
      parcela_nombre: parcelas.find(p => p.id === t.parcela_id)?.nombre || '-',
    }))
  } catch (e) {
    console.error('Error cargando dashboard:', e)
  }
}

function statusColor(estado) {
  const map = { pendiente: 'warning', 'en progreso': 'primary', completada: 'success', cancelada: 'danger' }
  return map[estado?.toLowerCase()] || 'medium'
}

onMounted(loadData)
</script>

<style scoped>
.welcome-section { margin-bottom: 16px; }
.welcome-section h2 { font-size: 1.4rem; font-weight: 700; margin: 0; }
.welcome-section p { color: var(--ion-color-medium); margin: 4px 0 0; }
.summary-card { text-align: center; border-radius: 12px; }
.card-icon { font-size: 32px; }
.card-count { font-size: 1.8rem; font-weight: 700; line-height: 1; margin: 4px 0; }
.card-label { font-size: 0.8rem; color: var(--ion-color-medium); }
</style>
