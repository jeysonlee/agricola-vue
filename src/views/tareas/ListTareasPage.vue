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

      <div v-if="!loading && filtered.length" class="tareas-list">
        <div
          v-for="item in filtered"
          :key="item.id"
          class="tarea-card"
          :class="`accent-${statusColor(item.estado)}`"
          @click="verDetalle(item)"
        >
          <!-- urgency strip if applicable -->
          <div v-if="urgenciaTarea(item)" class="urgencia-strip" :class="`strip-${urgenciaColor(urgenciaTarea(item))}`" />

          <div class="tarea-card-inner">
            <!-- top row -->
            <div class="tarea-card-top">
              <span class="tarea-tipo">{{ item.tipo_tarea || 'Sin tipo' }}</span>
              <div class="tarea-badges">
                <ion-badge :color="statusColor(item.estado)" class="estado-badge">{{ estadoLabel(item.estado) }}</ion-badge>
                <ion-badge v-if="urgenciaTarea(item)" :color="urgenciaColor(urgenciaTarea(item))" class="urgencia-badge">
                  {{ urgenciaLabel(urgenciaTarea(item)) }}
                </ion-badge>
              </div>
            </div>

            <!-- middle info -->
            <div class="tarea-card-meta">
              <span class="meta-chip">
                <ion-icon :icon="mapOutline" /> {{ parcelaNombre(item.parcela_id) }}
              </span>
              <span class="meta-chip">
                <ion-icon :icon="calendarOutline" /> {{ formatDateLabel(item) || '—' }}
              </span>
              <span v-if="item.costo_total > 0" class="meta-chip meta-cost">
                <ion-icon :icon="cashOutline" /> S/ {{ (+item.costo_total).toFixed(2) }}
              </span>
            </div>

            <p v-if="item.descripcion" class="tarea-desc">{{ item.descripcion }}</p>

            <!-- actions -->
            <div class="tarea-card-actions" @click.stop>
              <ion-button fill="clear" size="small" color="primary" :router-link="`/tabs/tareas/${item.id}/editar`">
                <ion-icon slot="start" :icon="createOutline" /> Editar
              </ion-button>
              <ion-button fill="clear" size="small" color="danger" :disabled="eliminando === item.id" @click="confirmarEliminar(item)">
                <ion-spinner v-if="eliminando === item.id" name="crescent" style="width:14px;height:14px" />
                <ion-icon v-else slot="start" :icon="trashOutline" />
                {{ eliminando === item.id ? '' : 'Eliminar' }}
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="clipboardOutline" />
        <p>No hay tareas registradas</p>
        <ion-button router-link="/tabs/tareas/nueva">Agregar Tarea</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />

    <!-- ── Detalle modal ── -->
    <ion-modal :is-open="detalleOpen" @didDismiss="detalleOpen = false" :breakpoints="[0, 0.85]" :initial-breakpoint="0.85">
      <ion-content v-if="selected" class="detalle-content">

        <!-- ── Hero ── -->
        <div class="detalle-hero" :class="`hero-${statusColor(selected.estado)}`">
          <button class="detalle-close" @click="detalleOpen = false">
            <ion-icon :icon="closeOutline" />
          </button>
          <div class="detalle-hero-icon">
            <ion-icon :icon="clipboardOutline" />
          </div>
          <h2 class="detalle-tipo">{{ selected.tipo_tarea || 'Tarea' }}</h2>
          <div class="detalle-hero-badges">
            <ion-badge :color="statusColor(selected.estado)" class="detalle-estado-badge">{{ estadoLabel(selected.estado) }}</ion-badge>
            <ion-badge v-if="urgenciaTarea(selected)" :color="urgenciaColor(urgenciaTarea(selected))" class="detalle-estado-badge">
              {{ urgenciaLabel(urgenciaTarea(selected)) }}
            </ion-badge>
          </div>
        </div>

        <div class="detalle-body">

          <!-- Parcela + descripción -->
          <div class="detalle-section">
            <div class="detalle-info-row">
              <div class="info-icon-wrap primary-wrap"><ion-icon :icon="mapOutline" /></div>
              <div class="info-text">
                <span class="info-label">Parcela</span>
                <span class="info-value">{{ parcelaNombre(selected.parcela_id) }}</span>
              </div>
            </div>
            <div v-if="selected.descripcion" class="detalle-info-row">
              <div class="info-icon-wrap medium-wrap"><ion-icon :icon="documentTextOutline" /></div>
              <div class="info-text">
                <span class="info-label">Descripción</span>
                <span class="info-value">{{ selected.descripcion }}</span>
              </div>
            </div>
          </div>

          <!-- Timeline de fechas -->
          <div class="detalle-section">
            <p class="section-label">Línea de tiempo</p>
            <div class="timeline">
              <div class="timeline-step" :class="{ active: !!selected.fecha_programada, inactive: !selected.fecha_programada }">
                <div class="tl-dot" />
                <div class="tl-info">
                  <span class="tl-title">Programada</span>
                  <span class="tl-date">{{ selected.fecha_programada ? formatDate(selected.fecha_programada) : '—' }}</span>
                </div>
              </div>
              <div class="timeline-step" :class="{ active: !!selected.fecha_inicio, inactive: !selected.fecha_inicio }">
                <div class="tl-dot" />
                <div class="tl-info">
                  <span class="tl-title">Inicio</span>
                  <span class="tl-date">{{ selected.fecha_inicio ? formatDate(selected.fecha_inicio) : '—' }}</span>
                </div>
              </div>
              <div class="timeline-step last" :class="{ active: !!selected.fecha_fin, inactive: !selected.fecha_fin }">
                <div class="tl-dot tl-dot-fin" />
                <div class="tl-info">
                  <span class="tl-title">Finalizada</span>
                  <span class="tl-date">{{ selected.fecha_fin ? formatDate(selected.fecha_fin) : '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Costo -->
          <div v-if="selected.costo_total > 0" class="detalle-section">
            <div class="costo-card" :class="selected.estado === 'programada' ? 'costo-warning' : 'costo-success'">
              <ion-icon :icon="cashOutline" />
              <div>
                <span class="costo-label">{{ selected.estado === 'programada' ? 'Cotización estimada' : 'Costo registrado' }}</span>
                <span class="costo-valor">S/ {{ (+selected.costo_total).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div v-if="selected.observaciones" class="detalle-section">
            <div class="obs-card">
              <ion-icon :icon="chatboxOutline" />
              <p>{{ selected.observaciones }}</p>
            </div>
          </div>

        </div>

        <!-- Acción -->
        <div class="detalle-footer">
          <ion-button expand="block" fill="solid" color="primary"
            :router-link="`/tabs/tareas/${selected.id}/editar`"
            @click="detalleOpen = false"
          >
            <ion-icon slot="start" :icon="createOutline" /> Editar tarea
          </ion-button>
        </div>

      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonButton, IonIcon,
  IonContent, IonSearchbar, IonRefresher,
  IonRefresherContent, IonLoading, IonModal, IonBadge, IonSpinner,
  alertController, toastController,
} from '@ionic/vue'
import { addOutline, clipboardOutline, createOutline, trashOutline, closeOutline, mapOutline, calendarOutline, cashOutline, documentTextOutline, chatboxOutline } from 'ionicons/icons'
import { useTareas }          from '../../composables/useTareas'
import { useParcelas }        from '../../composables/useParcelas'
import { useCosechas }        from '../../composables/useCosechas'
import { useAcceso }          from '../../composables/useAcceso'
import { useVentaDetalle }    from '../../composables/useVentaDetalle'
import { useCostoObreros }    from '../../composables/useCostoObreros'
import { useCostoHerramientas } from '../../composables/useCostoHerramientas'
import { useCostoInsumos }    from '../../composables/useCostoInsumos'
import { useNotificaciones, urgenciaTarea, urgenciaColor, urgenciaLabel } from '../../composables/useNotificaciones'

const { getAllByParcelas, eliminar: eliminarTarea }     = useTareas()
const { getAll: getParcelas }                          = useParcelas()
const { getParcelaIds }                                = useAcceso()
const { porTarea: cosechasPorTarea, eliminar: eliminarCosecha } = useCosechas()
const { porCosecha: detallesPorCosecha }               = useVentaDetalle()
const { eliminarPorTarea: eliminarMOs }                = useCostoObreros()
const { eliminarPorTarea: eliminarHerrs }              = useCostoHerramientas()
const { eliminarPorTarea: eliminarIns }                = useCostoInsumos()
const { cancelarAlarmasTarea }                         = useNotificaciones()

const items      = ref([])
const parcelas   = ref([])
const searchText = ref('')
const loading    = ref(false)
const eliminando = ref(null)   // id de la tarea que se está eliminando
const detalleOpen = ref(false)
const selected    = ref(null)

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.tipo_tarea?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.descripcion?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

function parcelaNombre(id) { return parcelas.value.find(p => p.id === id)?.nombre || '-' }
function formatDate(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE') : '-' }
function formatDateLabel(item) {
  if (item.estado === 'programada')   return item.fecha_programada ? 'Para: ' + formatDate(item.fecha_programada) : ''
  if (item.estado === 'en_ejecucion') return item.fecha_inicio     ? 'Inicio: ' + formatDate(item.fecha_inicio)   : ''
  if (item.estado === 'finalizada')   return item.fecha_fin        ? 'Fin: '    + formatDate(item.fecha_fin)       : ''
  return item.fecha_programada ? formatDate(item.fecha_programada) : ''
}
function estadoLabel(estado) {
  const map = { programada: 'Programada', en_ejecucion: 'En ejecución', finalizada: 'Finalizada', cancelada: 'Cancelada' }
  return map[estado] || estado || '-'
}
function statusColor(estado) {
  const map = { programada: 'primary', en_ejecucion: 'warning', finalizada: 'success', cancelada: 'danger' }
  return map[estado] || 'medium'
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const [p, ids] = await Promise.all([getParcelas(), getParcelaIds()])
    parcelas.value = p
    items.value = await getAllByParcelas(ids)
  } catch { showToast('Error al cargar tareas', 'danger') }
  finally { loading.value = false }
}

function verDetalle(item) { selected.value = item; detalleOpen.value = true }

async function confirmarEliminar(item) {
  // 1. Verificar cosechas vinculadas
  const cosechas = await cosechasPorTarea(item.id)

  // 2. Bloquear si alguna cosecha ya tiene ventas registradas
  for (const c of cosechas) {
    const detalles = await detallesPorCosecha(c.id)
    if (detalles.length > 0) {
      const a = await alertController.create({
        header: 'No se puede eliminar',
        message: 'Esta tarea tiene cosechas con ventas registradas. Elimina primero las ventas vinculadas antes de eliminar la tarea.',
        buttons: ['Entendido'],
      })
      return a.present()
    }
  }

  // 3. Construir mensaje según lo que se va a eliminar en cascada
  const lineas = [`¿Eliminar la tarea ${item.tipo_tarea || 'Sin tipo'}?`]
  if (item.estado === 'finalizada') {
    lineas.push('⚠️ Esta tarea ya está finalizada y tiene costos contabilizados.')
  }
  if (cosechas.length > 0) {
    lineas.push(`Se eliminarán también ${cosechas.length} cosecha(s) vinculada(s) sin ventas.`)
  }
  lineas.push('También se borrarán todos sus costos (mano de obra, insumos, herramientas).')

  const alert = await alertController.create({
    header: 'Eliminar Tarea',
    message: lineas.join(' '),
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: async () => {
          eliminando.value = item.id
          try {
            // Eliminar costos en paralelo
            await Promise.all([
              eliminarMOs(item.id),
              eliminarIns(item.id),
              eliminarHerrs(item.id),
            ])
            // Eliminar cosechas sin ventas
            for (const c of cosechas) await eliminarCosecha(c.id)
            // Cancelar alarmas nativas si existían
            await cancelarAlarmasTarea(item.id)
            // Eliminar la tarea
            await eliminarTarea(item.id)
            await loadData()
            showToast('Tarea eliminada correctamente', 'warning')
          } catch (e) {
            showToast('Error al eliminar: ' + e.message, 'danger')
          } finally {
            eliminando.value = null
          }
        },
      },
    ],
  })
  alert.present()
}

async function onRefresh(ev) { await loadData(); ev.target.complete() }
async function showToast(message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' })
  t.present()
}

onIonViewWillEnter(loadData)
onMounted(loadData)
</script>

<style scoped>
/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 60vh;
  color: var(--ion-color-medium); gap: 12px;
}
.empty-state ion-icon { font-size: 64px; }

/* ── Task cards list ── */
.tareas-list { padding: 10px 12px 80px; display: flex; flex-direction: column; gap: 10px; }

.tarea-card {
  border-radius: 14px;
  background: var(--ion-item-background, #fff);
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  transition: box-shadow 0.15s;
}
.tarea-card:active { box-shadow: 0 1px 4px rgba(0,0,0,0.12); }

/* left accent bar */
.tarea-card.accent-primary  { border-left: 4px solid var(--ion-color-primary); }
.tarea-card.accent-warning  { border-left: 4px solid var(--ion-color-warning); }
.tarea-card.accent-success  { border-left: 4px solid var(--ion-color-success); }
.tarea-card.accent-danger   { border-left: 4px solid var(--ion-color-danger); }
.tarea-card.accent-medium   { border-left: 4px solid var(--ion-color-medium); }

/* top urgency strip */
.urgencia-strip {
  display: none; /* shown via background on inner */
}
.strip-danger  { background: var(--ion-color-danger); }
.strip-warning { background: var(--ion-color-warning); }

.tarea-card-inner { flex: 1; padding: 12px 14px 8px; min-width: 0; }

.tarea-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.tarea-tipo { font-size: 0.95rem; font-weight: 700; color: var(--ion-text-color); flex: 1; line-height: 1.3; }

.tarea-badges { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.estado-badge   { font-size: 0.65rem; padding: 3px 8px; border-radius: 20px; font-weight: 600; }
.urgencia-badge { font-size: 0.62rem; padding: 3px 7px; border-radius: 20px; font-weight: 700; }

.tarea-card-meta {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;
}
.meta-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.75rem; color: var(--ion-color-medium);
  background: var(--ion-color-light); border-radius: 20px; padding: 3px 8px;
}
.meta-chip ion-icon { font-size: 0.85rem; }
.meta-cost { color: var(--ion-color-success-shade); background: rgba(var(--ion-color-success-rgb), 0.1); }

.tarea-desc {
  font-size: 0.78rem; color: var(--ion-color-medium);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 2px 0 6px;
}

.tarea-card-actions {
  display: flex; justify-content: flex-end; gap: 0;
  border-top: 1px solid var(--ion-color-light-shade); margin-top: 6px; padding-top: 2px;
}
.tarea-card-actions ion-button { --padding-start: 8px; --padding-end: 8px; font-size: 0.78rem; height: 34px; }

/* ── Detail modal ── */
.detalle-content { --background: var(--ion-background-color); }

.detalle-hero {
  position: relative;
  padding: 28px 20px 24px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 8px;
}
.hero-primary { background: linear-gradient(145deg, #1B4D3E, #236b52); }
.hero-warning { background: linear-gradient(145deg, #c57c12, #e09a25); }
.hero-success { background: linear-gradient(145deg, #1a6b3a, #2a8c50); }
.hero-danger  { background: linear-gradient(145deg, #9b1c1c, #c53030); }
.hero-medium  { background: linear-gradient(145deg, #4b5563, #6b7280); }

.detalle-close {
  position: absolute; top: 12px; right: 12px;
  background: rgba(255,255,255,0.15); border: none; border-radius: 50%;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 1.2rem; cursor: pointer;
}

.detalle-hero-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; color: #fff;
}
.detalle-tipo { font-size: 1.1rem; font-weight: 800; color: #fff; margin: 0; letter-spacing: 0.2px; }
.detalle-hero-badges { display: flex; gap: 6px; }
.detalle-estado-badge { font-size: 0.72rem; padding: 4px 10px; border-radius: 20px; font-weight: 700; }

/* body */
.detalle-body { padding: 0 16px 8px; }

.detalle-section {
  background: var(--ion-item-background, #fff);
  border-radius: 14px;
  margin: 12px 0;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0,0,0,0.07);
}

.section-label {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--ion-color-medium);
  padding: 12px 16px 4px; margin: 0;
}

.detalle-info-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}
.detalle-info-row:last-child { border-bottom: none; }

.info-icon-wrap {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.primary-wrap { background: rgba(var(--ion-color-primary-rgb), 0.12); color: var(--ion-color-primary); }
.medium-wrap  { background: var(--ion-color-light); color: var(--ion-color-medium); }

.info-text { display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 0.72rem; color: var(--ion-color-medium); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.info-value { font-size: 0.9rem; font-weight: 600; color: var(--ion-text-color); }

/* timeline */
.timeline { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 0; }

.timeline-step {
  display: flex; align-items: flex-start; gap: 12px;
  position: relative; padding-bottom: 20px;
}
.timeline-step.last { padding-bottom: 0; }
.timeline-step:not(.last)::before {
  content: ''; position: absolute;
  left: 7px; top: 14px;
  width: 2px; height: calc(100% - 8px);
  background: var(--ion-color-light-shade);
}

.tl-dot {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  background: var(--ion-color-light-shade);
  border: 2px solid var(--ion-color-light-shade);
  margin-top: 2px;
}
.timeline-step.active .tl-dot { background: var(--ion-color-primary); border-color: var(--ion-color-primary); }
.timeline-step.active .tl-dot-fin { background: var(--ion-color-success); border-color: var(--ion-color-success); }

.tl-info { display: flex; flex-direction: column; gap: 1px; }
.tl-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ion-color-medium); }
.timeline-step.active .tl-title { color: var(--ion-text-color); }
.tl-date { font-size: 0.9rem; font-weight: 600; color: var(--ion-color-medium); }
.timeline-step.active .tl-date { color: var(--ion-color-primary); }
.timeline-step.active .tl-dot-fin ~ .tl-info .tl-date { color: var(--ion-color-success); }

/* costo */
.costo-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  font-size: 1rem;
}
.costo-warning { color: var(--ion-color-warning-shade); }
.costo-success { color: var(--ion-color-success-shade); }
.costo-card ion-icon { font-size: 1.6rem; flex-shrink: 0; }
.costo-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; display: block; opacity: 0.75; }
.costo-valor { font-size: 1.25rem; font-weight: 800; display: block; }

/* observaciones */
.obs-card {
  display: flex; gap: 12px; padding: 14px 16px;
  color: var(--ion-color-medium); font-size: 0.88rem; line-height: 1.5;
}
.obs-card ion-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
.obs-card p { margin: 0; }

/* footer */
.detalle-footer { padding: 8px 16px 24px; }
.detalle-footer ion-button { --border-radius: 12px; height: 50px; font-size: 0.95rem; font-weight: 700; }
</style>
