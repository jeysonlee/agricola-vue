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
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <!-- Bienvenida -->
      <div class="welcome-row">
        <div>
          <h2 class="welcome-name">{{ auth.displayName || auth.currentUser?.email }}</h2>
          <p class="welcome-date">{{ fechaHoy }}</p>
        </div>
        <ion-badge :color="roleColor(auth.currentUser?.role)" class="role-badge">
          {{ auth.currentUser?.role || 'usuario' }}
        </ion-badge>
      </div>

      <ion-loading :is-open="loading" message="Cargando..." />

      <!-- ── Alertas de tareas urgentes ── -->
      <div v-if="!loading && alertas.total > 0" class="alertas-wrap">
        <div v-if="alertas.vencidas > 0" class="alerta-item alerta-danger" @click="$router.push('/tabs/tareas')">
          <ion-icon :icon="alertCircleOutline" />
          <div class="alerta-texto">
            <strong>{{ alertas.vencidas }} tarea{{ alertas.vencidas > 1 ? 's' : '' }} vencida{{ alertas.vencidas > 1 ? 's' : '' }}</strong>
            <span>Fecha programada ya pasó — requiere atención</span>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="alerta-chevron" />
        </div>
        <div v-if="alertas.hoy > 0" class="alerta-item alerta-danger" @click="$router.push('/tabs/tareas')">
          <ion-icon :icon="timeOutline" />
          <div class="alerta-texto">
            <strong>{{ alertas.hoy }} tarea{{ alertas.hoy > 1 ? 's' : '' }} programada{{ alertas.hoy > 1 ? 's' : '' }} para hoy</strong>
            <span>{{ tareasPorUrgencia('hoy').map(t => t.tipo_tarea).join(', ') }}</span>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="alerta-chevron" />
        </div>
        <div v-if="alertas.manana > 0" class="alerta-item alerta-warning" @click="$router.push('/tabs/tareas')">
          <ion-icon :icon="calendarOutline" />
          <div class="alerta-texto">
            <strong>{{ alertas.manana }} tarea{{ alertas.manana > 1 ? 's' : '' }} para mañana</strong>
            <span>{{ tareasPorUrgencia('manana').map(t => t.tipo_tarea).join(', ') }}</span>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="alerta-chevron" />
        </div>
        <div v-if="alertas.semana > 0" class="alerta-item alerta-semana" @click="$router.push('/tabs/tareas')">
          <ion-icon :icon="clipboardOutline" />
          <div class="alerta-texto">
            <strong>{{ alertas.semana }} tarea{{ alertas.semana > 1 ? 's' : '' }} esta semana</strong>
            <span>{{ tareasPorUrgencia('semana').map(t => t.tipo_tarea).join(', ') }}</span>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="alerta-chevron" />
        </div>
      </div>

      <!-- ── Resumen general ── -->
      <div class="section-header">
        <ion-icon :icon="statsChartOutline" color="primary" />
        <span>Productividad General</span>
      </div>

      <ion-card class="resumen-card">
        <ion-card-content>
          <div class="resumen-grid">
            <div class="resumen-item success">
              <ion-icon :icon="cashOutline" />
              <span class="r-label">Ingresos</span>
              <span class="r-value">S/ {{ fmtMoney(general.ingresos) }}</span>
            </div>
            <div class="resumen-item danger">
              <ion-icon :icon="cartOutline" />
              <span class="r-label">Egresos</span>
              <span class="r-value">S/ {{ fmtMoney(general.egresos) }}</span>
            </div>
            <div class="resumen-item" :class="general.utilidad >= 0 ? 'primary' : 'warning'">
              <ion-icon :icon="general.utilidad >= 0 ? trendingUpOutline : trendingDownOutline" />
              <span class="r-label">Utilidad</span>
              <span class="r-value">S/ {{ fmtMoney(general.utilidad) }}</span>
            </div>
            <div class="resumen-item medium">
              <ion-icon :icon="scaleOutline" />
              <span class="r-label">Kg vendidos</span>
              <span class="r-value">{{ fmtNum(general.kg_vendidos) }} kg</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- ── Parcelas: productividad individual ── -->
      <div class="section-header">
        <ion-icon :icon="mapOutline" color="primary" />
        <span>Parcelas ({{ reportes.length }})</span>
      </div>

      <div v-if="!loading && reportes.length" class="parcelas-grid">
        <ion-card
          v-for="r in reportes"
          :key="r.parcela_id"
          class="parcela-card"
          button
          router-link="/tabs/parcelas"
        >
          <ion-card-header class="parcela-header">
            <div class="parcela-header-row">
              <div>
                <ion-card-subtitle>{{ r.cultivo }} · {{ r.area }} ha</ion-card-subtitle>
                <ion-card-title class="parcela-title">{{ r.nombre }}</ion-card-title>
              </div>
              <ion-badge :color="r.utilidad >= 0 ? 'success' : 'danger'" class="util-badge">
                {{ r.utilidad >= 0 ? '+' : '' }}S/ {{ fmtMoney(r.utilidad) }}
              </ion-badge>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="prod-row">
              <div class="prod-col ingreso">
                <span class="prod-label">Ingresos</span>
                <span class="prod-val">S/ {{ fmtMoney(r.ingresos) }}</span>
              </div>
              <div class="prod-divider" />
              <div class="prod-col egreso">
                <span class="prod-label">Egresos</span>
                <span class="prod-val">S/ {{ fmtMoney(r.egresos) }}</span>
              </div>
            </div>
            <div class="parcela-meta">
              <span><ion-icon :icon="scaleOutline" /> {{ fmtNum(r.kg_vendidos) }} kg</span>
              <span><ion-icon :icon="checkmarkCircleOutline" /> {{ r.tareas_finalizadas }} tareas</span>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <div v-if="!loading && !reportes.length" class="empty-state">
        <ion-icon :icon="mapOutline" />
        <p>No hay parcelas asignadas</p>
      </div>

      <!-- ── Tareas recientes ── -->
      <div class="section-header">
        <ion-icon :icon="clipboardOutline" color="primary" />
        <span>Tareas Recientes</span>
      </div>

      <ion-card>
        <ion-card-content style="padding: 0">
          <ion-list v-if="recentTareas.length" lines="full">
            <ion-item
              v-for="t in recentTareas"
              :key="t.id"
              button
              router-link="/tabs/tareas"
            >
              <ion-icon :icon="clipboardOutline" slot="start" :color="statusColor(t.estado)" />
              <ion-label>
                <h3>{{ t.tipo_tarea || 'Tarea' }}</h3>
                <p>{{ t.parcela_nombre }}{{ t.descripcion ? ' — ' + t.descripcion : '' }}</p>
              </ion-label>
              <ion-badge :color="statusColor(t.estado)" slot="end">{{ estadoLabel(t.estado) }}</ion-badge>
            </ion-item>
          </ion-list>
          <p v-else class="ion-text-center ion-padding" style="color:var(--ion-color-medium)">
            Sin tareas recientes
          </p>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../components/AppHeader.vue'
import {
  IonPage, IonContent, IonButton, IonIcon,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonList, IonItem, IonLabel, IonBadge, IonLoading,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'
import {
  refreshOutline, mapOutline, clipboardOutline, cashOutline, cartOutline,
  statsChartOutline, trendingUpOutline, trendingDownOutline,
  scaleOutline, checkmarkCircleOutline,
  alertCircleOutline, timeOutline, calendarOutline, chevronForwardOutline,
} from 'ionicons/icons'
import { useAuthStore }  from '../stores/auth'
import { useReportes }   from '../composables/useReportes'
import { useTareas }     from '../composables/useTareas'
import { useParcelas }   from '../composables/useParcelas'
import { useAcceso }     from '../composables/useAcceso'
import { clasificarTareas } from '../composables/useNotificaciones'

const auth    = useAuthStore()
const { getReportePorParcelas } = useReportes()
const { getAllByParcelas }       = useTareas()
const { getAll: getParcelas }   = useParcelas()
const { getParcelaIds }         = useAcceso()

const loading      = ref(false)
const reportes     = ref([])
const recentTareas = ref([])
const grupos       = ref({ vencidas: [], hoy: [], manana: [], semana: [], proxima: [] })

const alertas = computed(() => ({
  vencidas: grupos.value.vencidas.length,
  hoy:      grupos.value.hoy.length,
  manana:   grupos.value.manana.length,
  semana:   grupos.value.semana.length,
  total:    grupos.value.vencidas.length + grupos.value.hoy.length +
            grupos.value.manana.length   + grupos.value.semana.length,
}))

function tareasPorUrgencia(nivel) {
  return grupos.value[nivel === 'hoy' ? 'hoy' : nivel === 'manana' ? 'manana' : 'semana'] || []
}

const general = computed(() => ({
  ingresos:    reportes.value.reduce((s, r) => s + r.ingresos,    0),
  egresos:     reportes.value.reduce((s, r) => s + r.egresos,     0),
  utilidad:    reportes.value.reduce((s, r) => s + r.utilidad,    0),
  kg_vendidos: reportes.value.reduce((s, r) => s + r.kg_vendidos, 0),
}))

const fechaHoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

function fmtMoney(v) {
  return (+v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtNum(v) {
  return (+v || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 })
}

function roleColor(role) {
  const r = role?.toLowerCase()
  if (r === 'superadmin') return 'danger'
  if (r === 'admin')      return 'warning'
  if (r === 'tecnico')    return 'tertiary'
  return 'primary'
}

function statusColor(estado) {
  const map = { programada: 'primary', en_ejecucion: 'warning', finalizada: 'success', cancelada: 'danger' }
  return map[estado] || 'medium'
}

function estadoLabel(estado) {
  const map = { programada: 'Prog.', en_ejecucion: 'Ejec.', finalizada: 'Fin.', cancelada: 'Canc.' }
  return map[estado] || estado || '—'
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const [reps, ids, parcelas] = await Promise.all([
      getReportePorParcelas(),
      getParcelaIds(),
      getParcelas(),
    ])
    reportes.value = reps

    const tareas = await getAllByParcelas(ids)
    grupos.value = clasificarTareas(tareas)
    const parcelaMap = Object.fromEntries(parcelas.map(p => [p.id, p.nombre]))
    recentTareas.value = tareas
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5)
      .map(t => ({ ...t, parcela_nombre: parcelaMap[t.parcela_id] || '—' }))
  } catch (e) {
    console.error('[Home] Error cargando dashboard:', e)
  } finally {
    loading.value = false
  }
}

async function onRefresh(ev) { await loadData(); ev.target.complete() }

onIonViewWillEnter(loadData)
onMounted(loadData)
</script>

<style scoped>
/* ── Welcome ── */
.welcome-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.welcome-name { font-size: 1.25rem; font-weight: 700; margin: 0; }
.welcome-date { font-size: 0.8rem; color: var(--ion-color-medium); margin: 2px 0 0; text-transform: capitalize; }
.role-badge { font-size: 0.72rem; padding: 4px 10px; border-radius: 20px; }

/* ── Section header ── */
.section-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.85rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--ion-color-medium);
  margin: 20px 0 8px;
}
.section-header ion-icon { font-size: 1rem; }

/* ── Resumen general ── */
.resumen-card { border-radius: 14px; margin: 0 0 4px; }
.resumen-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.resumen-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 10px 4px; border-radius: 10px;
  background: var(--ion-color-light);
}
.resumen-item ion-icon { font-size: 1.3rem; }
.resumen-item.success ion-icon { color: var(--ion-color-success); }
.resumen-item.danger  ion-icon { color: var(--ion-color-danger); }
.resumen-item.primary ion-icon { color: var(--ion-color-primary); }
.resumen-item.warning ion-icon { color: var(--ion-color-warning); }
.resumen-item.medium  ion-icon { color: var(--ion-color-medium); }
.r-label { font-size: 0.72rem; color: var(--ion-color-medium); }
.r-value { font-size: 1rem; font-weight: 700; }

/* ── Grid de parcelas ── */
.parcelas-grid { display: flex; flex-direction: column; gap: 8px; margin: 0 0 4px; }
.parcela-card  { border-radius: 14px; margin: 0; }
.parcela-header { padding-bottom: 0; }
.parcela-header-row { display: flex; align-items: flex-start; justify-content: space-between; }
.parcela-title { font-size: 1rem; font-weight: 700; margin: 0; }
.util-badge { font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }

.prod-row {
  display: flex; align-items: stretch;
  background: var(--ion-color-light); border-radius: 10px;
  margin: 8px 0 6px; overflow: hidden;
}
.prod-col { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 4px; }
.prod-divider { width: 1px; background: var(--ion-color-light-shade); }
.prod-label { font-size: 0.7rem; color: var(--ion-color-medium); }
.prod-col.ingreso .prod-val { color: var(--ion-color-success); font-weight: 700; }
.prod-col.egreso  .prod-val { color: var(--ion-color-danger);  font-weight: 700; }
.prod-val { font-size: 0.95rem; font-weight: 600; }

.parcela-meta {
  display: flex; gap: 16px; font-size: 0.78rem; color: var(--ion-color-medium);
}
.parcela-meta ion-icon { vertical-align: middle; margin-right: 2px; font-size: 0.9rem; }

/* ── Empty ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 0; color: var(--ion-color-medium); gap: 8px;
}
.empty-state ion-icon { font-size: 48px; }

/* ── Alertas de tareas ── */
.alertas-wrap { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }

.alerta-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px;
  cursor: pointer; transition: opacity 0.15s;
}
.alerta-item:active { opacity: 0.75; }
.alerta-item > ion-icon:first-child { font-size: 1.4rem; flex-shrink: 0; }
.alerta-chevron { font-size: 1rem; flex-shrink: 0; opacity: 0.6; }

.alerta-texto { flex: 1; display: flex; flex-direction: column; }
.alerta-texto strong { font-size: 0.85rem; font-weight: 700; line-height: 1.2; }
.alerta-texto span   { font-size: 0.75rem; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.alerta-danger {
  background: rgba(var(--ion-color-danger-rgb), 0.12);
  color: var(--ion-color-danger-shade);
}
.alerta-warning {
  background: rgba(var(--ion-color-warning-rgb), 0.15);
  color: var(--ion-color-warning-shade);
}
.alerta-semana {
  background: rgba(var(--ion-color-warning-rgb), 0.10);
  color: var(--ion-color-warning-shade);
}
</style>
