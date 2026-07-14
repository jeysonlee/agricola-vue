<template>
  <ion-page>
    <AppHeader title="Clima Agrícola">
      <template #end>
        <ion-button @click="abrirBuscador" fill="clear">
          <ion-icon slot="icon-only" :icon="searchOutline" />
        </ion-button>
        <ion-button @click="cargar" :disabled="loading || !isOnline" fill="clear">
          <ion-icon slot="icon-only" :icon="refreshOutline" />
        </ion-button>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Cargando primera vez (sin datos aún) -->
      <div v-if="loading && !actual" class="state-wrap">
        <ion-spinner name="crescent" color="primary" style="width:48px;height:48px" />
        <p>Obteniendo clima...</p>
      </div>

      <!-- Sin datos y sin internet -->
      <div v-else-if="!actual && !loading" class="no-datos-wrap">
        <span class="no-datos-emoji">🌤️</span>
        <h2>Sin datos de clima</h2>
        <p class="no-datos-msg">
          Para ver el pronóstico necesitas conexión a internet.<br/>
          Los datos se guardarán automáticamente para uso sin conexión.
        </p>

        <template v-if="isOnline">
          <!-- Online pero sin datos: error de GPS o primera vez -->
          <p v-if="error" class="error-chip">⚠️ {{ error }}</p>
          <ion-button expand="block" @click="cargar" class="btn-obtener">
            <ion-icon slot="start" :icon="navigateOutline" /> Usar mi ubicación GPS
          </ion-button>
          <div class="o-divider"><span>o busca tu ciudad</span></div>
          <div class="busqueda-inline">
            <ion-searchbar v-model="queryBusqueda" placeholder="Lima, Cusco, Trujillo..."
              debounce="400" @ionInput="onBuscar" @ionClear="resultadosCiudad.value = []" :animated="true" />
            <ion-spinner v-if="loadingBusqueda" name="dots" color="primary" style="display:block;margin:0 auto" />
            <ion-list v-if="resultadosCiudad.length" class="resultados-lista" lines="full">
              <ion-item v-for="c in resultadosCiudad" :key="`${c.lat}-${c.lon}`" button @click="elegirCiudad(c)">
                <ion-icon :icon="locationOutline" slot="start" color="primary" />
                <ion-label><h3>{{ c.nombre }}</h3><p>{{ [c.estado, c.pais].filter(Boolean).join(', ') }}</p></ion-label>
              </ion-item>
            </ion-list>
            <p v-if="!loadingBusqueda && queryBusqueda.length > 1 && !resultadosCiudad.length" class="sin-resultados">
              Sin resultados para "{{ queryBusqueda }}"
            </p>
          </div>
        </template>

        <template v-else>
          <!-- Offline sin datos -->
          <div class="offline-aviso">
            <ion-icon :icon="cloudOfflineOutline" color="medium" />
            <span>Sin conexión a internet. Conéctate para descargar el pronóstico.</span>
          </div>
        </template>
      </div>

      <!-- Con datos (online o cache offline) -->
      <template v-else-if="actual">

        <!-- ── HERO CLIMA ACTUAL ─────────────────────────────────────────── -->
        <div :class="['clima-hero', heroClass]">

          <!-- Fila: ubicación + estado red -->
          <div class="hero-top-row">
            <div class="hero-ubicacion">
              <ion-icon :icon="locationOutline" />
              <span>{{ ubicacion?.ciudad || 'Mi ubicación' }}</span>
            </div>
            <div v-if="!isOnline" class="estado-chip chip-offline">
              <ion-icon :icon="cloudOfflineOutline" /> Sin conexión
            </div>
            <div v-else-if="climaStore.minutosDesdeActualizacion" class="estado-chip chip-online">
              <ion-icon :icon="checkmarkCircleOutline" /> {{ climaStore.minutosDesdeActualizacion }}
            </div>
          </div>

          <!-- Datos guardados hace... (solo cuando offline) -->
          <p v-if="!isOnline && climaStore.minutosDesdeActualizacion" class="cache-aviso">
            Datos guardados {{ climaStore.minutosDesdeActualizacion }} · Solo lectura
          </p>

          <!-- Temperatura principal -->
          <div class="hero-temp-row">
            <span class="hero-emoji">{{ condicionEmoji(actual.weather?.[0]?.id) }}</span>
            <div class="hero-temp-info">
              <span class="hero-temp">{{ Math.round(actual.temp) }}<sup>°C</sup></span>
              <p class="hero-desc">{{ capitalize(actual.weather?.[0]?.description) }}</p>
            </div>
          </div>

          <!-- Min/Max/Sensación -->
          <div class="hero-minmax" v-if="pronostico[0]">
            <span class="minmax-item">
              <ion-icon :icon="arrowDownOutline" />{{ Math.round(pronostico[0].temp?.min) }}°
            </span>
            <span class="minmax-sep">·</span>
            <span class="minmax-item">
              <ion-icon :icon="arrowUpOutline" />{{ Math.round(pronostico[0].temp?.max) }}°
            </span>
            <span class="minmax-sep">·</span>
            <span class="minmax-item">ST {{ Math.round(actual.feels_like) }}°</span>
          </div>

          <!-- Stats rápidas -->
          <div class="hero-stats">
            <span class="hs-item">💧 {{ actual.humidity }}%</span>
            <span class="hs-sep">·</span>
            <span class="hs-item">💨 {{ Math.round(actual.wind_speed * 3.6) }} km/h</span>
            <span class="hs-sep">·</span>
            <span class="hs-item">☀️ UV {{ actual.uvi }}</span>
            <span class="hs-sep">·</span>
            <span class="hs-item">👁 {{ fmtVisibilidad(actual.visibility) }}</span>
          </div>

          <!-- Botón actualizar (visible cuando online y datos > 15 min) -->
          <div v-if="isOnline && climaStore.caducado" class="hero-btn-row">
            <ion-button @click="cargar" :disabled="loading" fill="outline" size="small" color="light" class="btn-actualizar-hero">
              <ion-icon slot="start" :icon="refreshOutline" />
              {{ loading ? 'Actualizando...' : 'Actualizar pronóstico' }}
            </ion-button>
          </div>
          <div v-else-if="isOnline" class="hero-btn-row">
            <ion-button @click="abrirBuscador" fill="clear" size="small" color="light" class="btn-cambiar">
              <ion-icon slot="start" :icon="searchOutline" /> Cambiar ciudad
            </ion-button>
          </div>
        </div>

        <!-- ── AVISO LLUVIA MAÑANA (horas de labor, antes de 7pm) ─────────── -->
        <div v-if="avisoLluviaManana" class="lluvia-alerta-banner">
          <span class="lluvia-alerta-emoji">🌧️</span>
          <p>{{ avisoLluviaManana.mensaje }}</p>
        </div>

        <!-- ── AVISOS DEL DÍA ──────────────────────────────────────────────── -->
        <div class="section-header">
          <ion-icon :icon="notificationsOutline" color="warning" />
          <span>Avisos del día</span>
        </div>

        <div class="avisos-wrap">
          <div v-if="avisoHoy" :class="['aviso-card', `aviso-${avisoHoy.color}`]">
            <div class="aviso-head">
              <span class="aviso-emoji">{{ avisoHoy.emoji }}</span>
              <div class="aviso-head-text">
                <span class="aviso-etiqueta">HOY</span>
                <span class="aviso-titulo">{{ avisoHoy.titulo }}</span>
              </div>
              <ion-badge :color="avisoHoy.color">{{ avisoHoy.urgente ? '⚠️ Aviso' : '✅ Bueno' }}</ion-badge>
            </div>
            <p class="aviso-resumen">{{ avisoHoy.resumen }}</p>
            <div class="aviso-tags" v-if="avisoHoy.buenoPara.length">
              <span class="tag-label">Bueno para:</span>
              <span v-for="(b, i) in avisoHoy.buenoPara" :key="i" class="tag tag-ok">{{ b }}</span>
            </div>
            <div class="aviso-tags" v-if="avisoHoy.maloPara.length">
              <span class="tag-label">Evitar:</span>
              <span v-for="(m, i) in avisoHoy.maloPara" :key="i" class="tag tag-mal">{{ m }}</span>
            </div>
          </div>

          <div v-if="avisoManana" :class="['aviso-card', `aviso-${avisoManana.color}`]">
            <div class="aviso-head">
              <span class="aviso-emoji">{{ avisoManana.emoji }}</span>
              <div class="aviso-head-text">
                <span class="aviso-etiqueta">MAÑANA</span>
                <span class="aviso-titulo">{{ avisoManana.titulo }}</span>
              </div>
              <ion-badge :color="avisoManana.color">{{ avisoManana.urgente ? '⚠️ Aviso' : '✅ Bueno' }}</ion-badge>
            </div>
            <p class="aviso-resumen">{{ avisoManana.resumen }}</p>
            <div class="aviso-tags" v-if="avisoManana.buenoPara.length">
              <span class="tag-label">Bueno para:</span>
              <span v-for="(b, i) in avisoManana.buenoPara" :key="i" class="tag tag-ok">{{ b }}</span>
            </div>
            <div class="aviso-tags" v-if="avisoManana.maloPara.length">
              <span class="tag-label">Evitar:</span>
              <span v-for="(m, i) in avisoManana.maloPara" :key="i" class="tag tag-mal">{{ m }}</span>
            </div>
          </div>
        </div>

        <!-- ── TAREAS EN RIESGO ────────────────────────────────────────────── -->
        <template v-if="tareasEnRiesgo.length">
          <div class="section-header">
            <ion-icon :icon="warningOutline" color="danger" />
            <span>Tareas con riesgo climático</span>
          </div>
          <div class="riesgo-wrap">
            <div v-for="tr in tareasEnRiesgo" :key="tr.tarea.id"
                 :class="['riesgo-item', tr.aviso.color === 'danger' ? 'riesgo-danger' : 'riesgo-warning']">
              <span class="riesgo-emoji">{{ tr.aviso.emoji }}</span>
              <div>
                <p class="riesgo-tarea">{{ tr.tarea.tipo_tarea || 'Tarea' }}</p>
                <p class="riesgo-fecha">{{ fmtDiaCompleto(tr.fechaStr) }} · {{ tr.aviso.titulo }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- ── PRONÓSTICO 7 DÍAS ───────────────────────────────────────────── -->
        <div class="section-header">
          <ion-icon :icon="calendarOutline" color="tertiary" />
          <span>Pronóstico 7 días</span>
        </div>

        <ion-card class="pronostico-card">
          <div
            v-for="(d, i) in pronostico"
            :key="i"
            :class="['dia-row-item', colorClaseDia(avisosPronostico[i])]"
            @click="abrirDetalle(d, i)"
          >
            <!-- Franja de color izquierda -->
            <div :class="['dia-franja', `franja-${avisosPronostico[i]?.color || 'medium'}`]"></div>

            <!-- Emoji condición (grande) -->
            <span class="dia-icono">{{ iconoDia(d, i) }}</span>

            <!-- Texto central -->
            <div class="dia-texto">
              <div class="dia-nombre-row">
                <span class="dia-nombre">{{ i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fmtDia(d.dt) }}</span>
                <!-- Badge de lluvia o soleado -->
                <span :class="['dia-prob-badge', probClase(avisosPronostico[i])]">{{ textoProb(avisosPronostico[i], diasAjustados[i]) }}</span>
              </div>
              <span class="dia-tip">{{ avisosPronostico[i]?.resumen?.split('.')[0] ?? capitalize(d.weather?.[0]?.description) }}</span>
            </div>

            <!-- Temperaturas -->
            <div class="dia-temps">
              <span class="temp-max">{{ Math.round(d.temp?.max) }}°</span>
              <span class="temp-min">{{ Math.round(d.temp?.min) }}°</span>
            </div>

            <!-- Flecha -->
            <ion-icon :icon="chevronForwardOutline" class="dia-arrow" color="medium" />
          </div>
        </ion-card>

        <!-- ── PRÓXIMAS 24 HORAS ──────────────────────────────────────────── -->
        <div class="section-header">
          <ion-icon :icon="timeOutline" color="primary" />
          <span>Próximas 24 horas</span>
        </div>
        <div class="horas-scroll-wrap">
          <div class="horas-scroll">
            <div v-for="(h, i) in horasCortas" :key="i" class="hora-item">
              <span class="hora-time">{{ fmtHoraCorta(h.dt) }}</span>
              <span class="hora-emoji">{{ condicionEmoji(h.weather?.[0]?.id) }}</span>
              <span class="hora-temp">{{ Math.round(h.temp) }}°</span>
              <span v-if="(h.pop ?? 0) > 0.1" class="hora-lluvia">💧 {{ Math.round(h.pop * 100) }}% lluvia</span>
            </div>
          </div>
        </div>

        <!-- ── ALERTAS OFICIALES ──────────────────────────────────────────── -->
        <template v-if="alertas.length">
          <div class="section-header">
            <ion-icon :icon="alertCircleOutline" color="danger" />
            <span>Alertas Meteorológicas</span>
          </div>
          <ion-card v-for="(a, i) in alertas" :key="i" class="alerta-card">
            <ion-card-header>
              <ion-card-title class="alerta-title">
                <ion-icon :icon="warningOutline" color="danger" /> {{ a.event }}
              </ion-card-title>
              <ion-card-subtitle>{{ a.sender_name }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>{{ a.description }}</ion-card-content>
          </ion-card>
        </template>

        <div style="height:28px" />
      </template>

      <ion-loading :is-open="loading && !!actual" message="Actualizando..." />
    </ion-content>

    <!-- ── Modal buscador ─────────────────────────────────────────────────── -->
    <ion-modal :is-open="modalBuscador" @didDismiss="cerrarBuscador" :breakpoints="[0, 0.75]" :initial-breakpoint="0.75">
      <ion-header>
        <ion-toolbar>
          <ion-title>Buscar ciudad</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="cerrarBuscador"><ion-icon :icon="closeOutline" /></ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-searchbar v-model="queryBusqueda" placeholder="Lima, Arequipa, Cusco..."
          debounce="400" @ionInput="onBuscar" @ionClear="resultadosCiudad = []" :animated="true" autofocus />
        <ion-spinner v-if="loadingBusqueda" name="dots" color="primary" style="display:block;margin:12px auto" />
        <ion-list v-if="resultadosCiudad.length" lines="full">
          <ion-item v-for="c in resultadosCiudad" :key="`${c.lat}-${c.lon}`" button @click="elegirCiudad(c)">
            <ion-icon :icon="locationOutline" slot="start" color="primary" />
            <ion-label><h3>{{ c.nombre }}</h3><p>{{ [c.estado, c.pais].filter(Boolean).join(', ') }}</p></ion-label>
          </ion-item>
        </ion-list>
        <p v-if="!loadingBusqueda && queryBusqueda.length > 1 && !resultadosCiudad.length" class="sin-resultados">
          Sin resultados para "{{ queryBusqueda }}"
        </p>
        <ion-button expand="block" fill="outline" @click="usarGPS" style="margin-top:20px">
          <ion-icon slot="start" :icon="navigateOutline" /> Usar GPS
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- ── Modal detalle de día ───────────────────────────────────────────── -->
    <ion-modal
      :is-open="!!diaDetalle"
      @didDismiss="diaDetalle = null"
      :breakpoints="[0, 0.75, 0.95]"
      :initial-breakpoint="0.75"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>
            {{ diaDetalle ? (diaDetalleIdx === 0 ? 'Hoy' : diaDetalleIdx === 1 ? 'Mañana' : fmtDia(diaDetalle.dt)) : '' }}
          </ion-title>
          <ion-buttons slot="end">
            <ion-button @click="diaDetalle = null"><ion-icon :icon="closeOutline" /></ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="diaDetalle && avisoDetalle">

        <!-- Cabecera del día -->
        <div :class="['detalle-hero', `detalle-${avisoDetalle.color}`]">
          <span class="detalle-emoji">{{ avisoDetalle.emoji }}</span>
          <div>
            <p class="detalle-titulo">{{ avisoDetalle.titulo }}</p>
            <p class="detalle-resumen">{{ avisoDetalle.resumen }}</p>
          </div>
        </div>

        <!-- Probabilidad de lluvia prominente -->
        <div class="prob-banner" :class="probClase(avisoDetalle)">
          <span class="prob-num">{{ Math.round((diaDetalle.pop ?? 0) * 100) }}%</span>
          <span class="prob-lbl">probabilidad de lluvia</span>
          <div class="prob-bar">
            <div class="prob-fill" :style="`width:${Math.round((diaDetalle.pop ?? 0) * 100)}%`"></div>
          </div>
        </div>

        <!-- Métricas del día -->
        <div class="detalle-grid">
          <div class="detalle-stat">
            <span class="ds-icon">{{ avisoDetalle.emoji }}</span>
            <span class="ds-val">{{ Math.round(diaDetalle.temp?.max) }}° / {{ Math.round(diaDetalle.temp?.min) }}°</span>
            <small>Máx / Mín</small>
          </div>
          <div class="detalle-stat">
            <span class="ds-icon">💧</span>
            <span class="ds-val">{{ diaDetalle.humidity }}%</span>
            <small>Humedad</small>
          </div>
          <div class="detalle-stat">
            <span class="ds-icon">💨</span>
            <span class="ds-val">{{ Math.round((diaDetalle.wind_speed ?? 0) * 3.6) }} km/h</span>
            <small>Viento</small>
          </div>
          <div class="detalle-stat" v-if="diaDetalle.uvi != null">
            <span class="ds-icon">☀️</span>
            <span class="ds-val">{{ diaDetalle.uvi }}</span>
            <small>Índice UV</small>
          </div>
        </div>

        <!-- Bueno / Malo para -->
        <div v-if="avisoDetalle.buenoPara.length" class="detalle-lista-wrap">
          <p class="detalle-list-title ok">✅ Bueno para</p>
          <div class="detalle-chips">
            <span v-for="(b, i) in avisoDetalle.buenoPara" :key="i" class="chip chip-ok">{{ b }}</span>
          </div>
        </div>
        <div v-if="avisoDetalle.maloPara.length" class="detalle-lista-wrap">
          <p class="detalle-list-title mal">❌ Evitar</p>
          <div class="detalle-chips">
            <span v-for="(m, i) in avisoDetalle.maloPara" :key="i" class="chip chip-mal">{{ m }}</span>
          </div>
        </div>

        <!-- Tareas programadas -->
        <template v-if="tareasDelDia(diaDetalle.dt).length">
          <p class="detalle-list-title tareas">📋 Tareas programadas ese día</p>
          <div v-for="t in tareasDelDia(diaDetalle.dt)" :key="t.id" class="tarea-row">
            <ion-icon :icon="clipboardOutline" color="primary" />
            <div>
              <span class="tr-tipo">{{ t.tipo_tarea || 'Tarea' }}</span>
              <span class="tr-estado">{{ t.estado }}</span>
            </div>
          </div>
        </template>

      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import {
  IonPage, IonContent, IonButton, IonIcon, IonBadge, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonList, IonItem, IonLabel,
  IonSpinner, IonLoading, IonRefresher, IonRefresherContent, IonSearchbar,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/vue'
import {
  refreshOutline, locationOutline, timeOutline, calendarOutline,
  alertCircleOutline, warningOutline, notificationsOutline, arrowDownOutline,
  arrowUpOutline, searchOutline, navigateOutline, closeOutline, clipboardOutline,
  chevronForwardOutline, cloudOfflineOutline, checkmarkCircleOutline,
} from 'ionicons/icons'
import { Network } from '@capacitor/network'
import AppHeader        from '../../components/AppHeader.vue'
import { useClima, condicionEmoji, generarAvisoDia, pronosticoLluviaManana } from '../../composables/useClima'
import { useClimaStore } from '../../stores/clima'
import { useTareas }     from '../../composables/useTareas'
import { useAcceso }     from '../../composables/useAcceso'

const climaStore = useClimaStore()
const {
  loading, loadingBusqueda, error,
  actual, pronostico, horas, alertas, ubicacion, horasCortas,
  resultadosCiudad,
  cargarClima, seleccionarCiudad, buscarCiudades,
} = useClima()

// ── Red ───────────────────────────────────────────────────────────────────────
const isOnline = ref(navigator.onLine)
let   netListener = null

onMounted(async () => {
  try {
    const status = await Network.getStatus()
    isOnline.value = status.connected
  } catch { isOnline.value = navigator.onLine }

  netListener = await Network.addListener('networkStatusChange', async (s) => {
    const wasOffline = !isOnline.value
    isOnline.value   = s.connected
    // Auto-refresh si volvemos a tener internet y los datos están caducados
    if (s.connected && wasOffline && climaStore.caducado) {
      await cargar()
    }
  })
})

onUnmounted(() => { netListener?.remove() })

// ── Tareas ────────────────────────────────────────────────────────────────────
const tareasPendientes = ref([])

async function cargarTareas() {
  try {
    const { getParcelaIds } = useAcceso()
    const { getAllByParcelas } = useTareas()
    const ids  = await getParcelaIds()
    const todas = await getAllByParcelas(ids)
    tareasPendientes.value = todas.filter(t => t.estado === 'programada' && t.fecha_programada)
  } catch { tareasPendientes.value = [] }
}

// ── Avisos ────────────────────────────────────────────────────────────────────
// Probabilidad de lluvia restringida a horario laboral (00:00-19:00) para un día
// dado, usando el pronóstico horario cuando está disponible (hoy/mañana). Sin
// datos horarios para ese día, devuelve null y se usa el pop diario de la API.
function popEnHorarioLaboral(diaDt, horasArr) {
  if (!horasArr?.length) return null
  const fechaStr = new Date(diaDt * 1000).toDateString()
  const horasDia = horasArr.filter(h => {
    const f = new Date(h.dt * 1000)
    return f.toDateString() === fechaStr && f.getHours() < 19
  })
  if (!horasDia.length) return null
  return Math.max(...horasDia.map(h => h.pop ?? 0))
}

// Días del pronóstico con el pop ajustado a horario laboral cuando hay datos
// horarios disponibles; el resto conserva el pop diario tal como lo da la API.
// Esto evita que el badge, el resumen y el detalle de un mismo día se contradigan.
const diasAjustados = computed(() => pronostico.value.map(d => {
  const popLaboral = popEnHorarioLaboral(d.dt, horas.value)
  return popLaboral != null ? { ...d, pop: popLaboral } : d
}))

// "Hoy" usa la condición ACTUAL (misma fuente que el ícono del hero) en vez del
// resumen diario, para que el ícono grande y el texto de aviso nunca se contradigan.
const avisoHoy = computed(() => {
  if (!diasAjustados.value[0]) return null
  const base = diasAjustados.value[0]
  if (actual.value?.weather?.length) return generarAvisoDia({ ...base, weather: actual.value.weather })
  return generarAvisoDia(base)
})
const avisoManana      = computed(() => diasAjustados.value[1] ? generarAvisoDia(diasAjustados.value[1]) : null)
const avisosPronostico = computed(() => diasAjustados.value.map((d, i) => i === 0 ? avisoHoy.value : generarAvisoDia(d)))

// Aviso de lluvia probable mañana, solo si ocurre en horas de labor (antes de 7pm)
const avisoLluviaManana = computed(() => {
  const r = pronosticoLluviaManana(horas.value)
  if (!r) return null
  return {
    ...r,
    mensaje: `Mañana hay pronóstico de lluvia (${Math.round(r.popMax * 100)}%), con mayor probabilidad cerca de las ${fmtHoraCorta(r.horaPico)}. Planifique sus labores de campo antes de esa hora.`,
  }
})

const tareasEnRiesgo = computed(() => {
  const result = []
  diasAjustados.value.forEach((dia, i) => {
    const aviso = avisosPronostico.value[i]
    if (!aviso?.urgente) return
    const fechaStr = dtToDateStr(dia.dt)
    for (const tarea of tareasPendientes.value) {
      if (tarea.fecha_programada === fechaStr) result.push({ tarea, aviso, fechaStr })
    }
  })
  return result
})

function tareasDelDia(dt) {
  const fechaStr = dtToDateStr(dt)
  return tareasPendientes.value.filter(t => t.fecha_programada === fechaStr)
}

function dtToDateStr(unix) { return new Date(unix * 1000).toISOString().split('T')[0] }

// ── Detalle de día ────────────────────────────────────────────────────────────
const diaDetalle    = ref(null)
const diaDetalleIdx = ref(0)
const avisoDetalle  = computed(() => {
  if (!diaDetalle.value) return null
  return diaDetalleIdx.value === 0 ? avisoHoy.value : generarAvisoDia(diaDetalle.value)
})

function abrirDetalle(dia, idx) { diaDetalle.value = diasAjustados.value[idx]; diaDetalleIdx.value = idx }

// ── Buscador ──────────────────────────────────────────────────────────────────
const queryBusqueda = ref('')
const modalBuscador = ref(false)

function abrirBuscador() { queryBusqueda.value = ''; resultadosCiudad.value = []; modalBuscador.value = true }
function cerrarBuscador() { modalBuscador.value = false }
async function onBuscar(ev) { await buscarCiudades(ev.target?.value ?? queryBusqueda.value) }
async function elegirCiudad(c) {
  cerrarBuscador()
  queryBusqueda.value = ''; resultadosCiudad.value = []
  await seleccionarCiudad(c)
  if (actual.value) guardarEnStore()
}
async function usarGPS() { cerrarBuscador(); await cargar() }

// ── Carga ─────────────────────────────────────────────────────────────────────
async function cargar() {
  await cargarClima()
  if (actual.value) guardarEnStore()
}

async function onRefresh(ev) { await cargar(); ev.target.complete() }

function guardarEnStore() {
  climaStore.guardar({
    actual: actual.value, pronostico: pronostico.value,
    horas: horas.value, alertas: alertas.value, ubicacion: ubicacion.value,
  })
}

function restaurarDesdeStore(d) {
  actual.value     = d.actual
  pronostico.value = d.pronostico ?? []
  horas.value      = d.horas ?? []
  alertas.value    = d.alertas ?? []
  ubicacion.value  = d.ubicacion ?? null
}

onIonViewWillEnter(async () => {
  cargarTareas()

  // 1. Intenta memoria (si ya estaba en esta sesión)
  if (!climaStore.caducado && climaStore.datos?.actual) {
    restaurarDesdeStore(climaStore.datos)
    return
  }

  // 2. Intenta caché persistido en disco (sesiones anteriores)
  const teniaCaché = await climaStore.cargarDesdeCache()
  if (teniaCaché && climaStore.datos?.actual) {
    restaurarDesdeStore(climaStore.datos)
    // Si hay internet y los datos están caducados, refresca en segundo plano
    if (isOnline.value && climaStore.caducado) cargar()
    return
  }

  // 3. Sin caché: carga directa si hay internet
  if (isOnline.value) cargar()
})

// ── Visual helpers ────────────────────────────────────────────────────────────
const heroClass = computed(() => {
  const id = actual.value?.weather?.[0]?.id ?? 800
  if (id >= 200 && id < 300) return 'hero-tormenta'
  if (id >= 300 && id < 600) return 'hero-lluvia'
  if (id >= 600 && id < 700) return 'hero-helada'
  if (id >= 700 && id < 800) return 'hero-neblina'
  if (id === 800)             return 'hero-soleado'
  return 'hero-nublado'
})

// Badge y color de cada fila: se derivan del MISMO aviso (generarAvisoDia) que
// el resumen de texto, para que nunca digan cosas distintas sobre el mismo día.
// Si no va a llover, indica sol/nublado; si sí, muestra qué tan probable es.
function textoProb(aviso, dia) {
  if (!aviso) return ''
  const pop = Math.round((dia?.pop ?? 0) * 100)
  switch (aviso.tipo) {
    case 'tormenta':       return `⛈ ${pop}% lluvia`
    case 'llovizna':       return `🌦 ${pop}% lluvia`
    case 'lluvia':         return `🌧 ${pop}% lluvia`
    case 'posible-lluvia': return `🌦 ${pop}% lluvia`
    case 'helada':         return '❄️ Helada'
    case 'calor':          return '🌡️ Calor'
    case 'frio':           return '🥶 Frío'
    case 'neblina':        return '🌫 Neblina'
    case 'soleado':        return '☀️ Soleado'
    default:                return pop >= 10 ? `☁️ ${pop}% lluvia` : '☁️ Nublado'
  }
}

function probClase(aviso) {
  return aviso ? `prob-${aviso.color}` : 'prob-medium'
}

// Ícono de la fila: "Hoy" usa la condición actual (misma fuente que el hero);
// el resto usa la condición diaria ajustada, igual que su aviso.
function iconoDia(dia, i) {
  const id = (i === 0 && actual.value?.weather?.length) ? actual.value.weather[0].id : dia.weather?.[0]?.id
  return condicionEmoji(id)
}

function colorClaseDia(aviso) {
  if (!aviso) return ''
  return `dia-bg-${aviso.color}`
}

function fmtHoraCorta(unix) {
  if (!unix) return ''
  const h = new Date(unix * 1000).getHours()
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}
function fmtDia(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtDiaCompleto(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtVisibilidad(m) {
  if (m == null) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : '' }
</script>

<style scoped>
/* ══ HERO ══════════════════════════════════════════════════════════════════════ */
.clima-hero {
  padding: 20px 18px 18px;
  color: #fff;
  transition: background .4s;
}
.hero-soleado  { background: linear-gradient(145deg, #1E88E5 0%, #0D47A1 100%); }
.hero-nublado  { background: linear-gradient(145deg, #546E7A 0%, #37474F 100%); }
.hero-lluvia   { background: linear-gradient(145deg, #1565C0 0%, #0A2472 100%); }
.hero-tormenta { background: linear-gradient(145deg, #283593 0%, #1A237E 100%); }
.hero-helada   { background: linear-gradient(145deg, #4FC3F7 0%, #0277BD 100%); }
.hero-neblina  { background: linear-gradient(145deg, #78909C 0%, #455A64 100%); }

.hero-top-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
}
.hero-ubicacion {
  display: flex; align-items: center; gap: 5px; font-size: 14px; opacity: .9;
}
.estado-chip {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 20px; letter-spacing: .2px;
}
.chip-offline { background: rgba(0,0,0,.35); color: #ffcdd2; }
.chip-online  { background: rgba(255,255,255,.2); color: #e8f5e9; }

.cache-aviso { font-size: 11px; opacity: .7; margin: 0 0 10px; }

.hero-temp-row { display: flex; align-items: center; gap: 12px; margin: 10px 0 6px; }
.hero-emoji    { font-size: 64px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,.3)); }
.hero-temp     { font-size: 72px; font-weight: 800; line-height: 1; }
.hero-temp sup { font-size: 28px; font-weight: 400; vertical-align: super; }
.hero-desc     { font-size: 15px; opacity: .85; margin: 4px 0 0; }

.hero-minmax {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; opacity: .8; margin-bottom: 12px;
}
.minmax-item { display: flex; align-items: center; gap: 2px; }
.minmax-sep  { opacity: .4; }

.hero-stats {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  font-size: 12px; opacity: .82;
  background: rgba(0,0,0,.15); border-radius: 10px; padding: 8px 12px;
  margin-bottom: 12px;
}
.hs-item { white-space: nowrap; }
.hs-sep  { opacity: .35; }

.hero-btn-row { text-align: center; }
.btn-actualizar-hero { --color: white; --border-color: rgba(255,255,255,.6); }
.btn-cambiar         { --color: rgba(255,255,255,.75); }

/* ══ SECTION HEADER ═══════════════════════════════════════════════════════════ */
.section-header {
  display: flex; align-items: center; gap: 8px;
  padding: 18px 16px 8px; font-size: 12px; font-weight: 700;
  color: var(--ion-color-dark); text-transform: uppercase; letter-spacing: .6px;
}

/* ══ AVISO LLUVIA MAÑANA ══════════════════════════════════════════════════════ */
.lluvia-alerta-banner {
  display: flex; align-items: center; gap: 10px;
  margin: 10px 12px 0; padding: 12px 14px;
  background: rgba(var(--ion-color-warning-rgb), .15);
  border-left: 4px solid var(--ion-color-warning);
  border-radius: 10px;
}
.lluvia-alerta-emoji { font-size: 26px; flex-shrink: 0; }
.lluvia-alerta-banner p { margin: 0; font-size: 13px; color: var(--ion-color-dark); line-height: 1.4; }

/* ══ AVISOS ═══════════════════════════════════════════════════════════════════ */
.avisos-wrap { padding: 0 12px 8px; display: flex; flex-direction: column; gap: 10px; }
.aviso-card {
  border-radius: 14px; padding: 14px 16px;
  border-left: 5px solid transparent;
}
.aviso-success { background: #f0faf3; border-left-color: var(--ion-color-success); }
.aviso-warning { background: #fffbec; border-left-color: var(--ion-color-warning); }
.aviso-danger  { background: #fff0f0; border-left-color: var(--ion-color-danger);  }
.aviso-medium  { background: var(--ion-color-light); border-left-color: var(--ion-color-medium); }

.aviso-head      { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.aviso-emoji     { font-size: 32px; flex-shrink: 0; }
.aviso-head-text { flex: 1; min-width: 0; }
.aviso-etiqueta  { display: block; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: var(--ion-color-medium); margin-bottom: 1px; }
.aviso-titulo    { display: block; font-size: 14px; font-weight: 700; color: var(--ion-color-dark); }
.aviso-resumen   { font-size: 13px; color: #555; margin: 0 0 8px; line-height: 1.45; }
.aviso-tags      { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; align-items: center; }
.tag-label       { font-size: 11px; font-weight: 600; color: var(--ion-color-medium); }
.tag             { font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.tag-ok          { background: rgba(var(--ion-color-success-rgb),.15); color: var(--ion-color-success-shade); }
.tag-mal         { background: rgba(var(--ion-color-danger-rgb),.12);  color: var(--ion-color-danger-shade); }

/* ══ RIESGO ═══════════════════════════════════════════════════════════════════ */
.riesgo-wrap   { padding: 0 12px 8px; display: flex; flex-direction: column; gap: 6px; }
.riesgo-item   { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; }
.riesgo-danger { background: rgba(var(--ion-color-danger-rgb),.1); }
.riesgo-warning{ background: rgba(var(--ion-color-warning-rgb),.12); }
.riesgo-emoji  { font-size: 26px; flex-shrink: 0; }
.riesgo-tarea  { font-size: 14px; font-weight: 600; color: var(--ion-color-dark); margin: 0; }
.riesgo-fecha  { font-size: 12px; color: var(--ion-color-medium); margin: 0; text-transform: capitalize; }

/* ══ PRONÓSTICO 7 DÍAS ════════════════════════════════════════════════════════ */
.pronostico-card {
  margin: 0 12px 8px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.08);
}

.dia-row-item {
  display: flex; align-items: center;
  padding: 13px 14px 13px 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,.06);
  transition: background .15s;
  position: relative;
}
.dia-row-item:last-child { border-bottom: none; }
.dia-row-item:active { background: rgba(0,0,0,.04); }

/* Franja lateral de color */
.dia-franja {
  width: 5px; min-height: 56px; flex-shrink: 0; margin-right: 12px; border-radius: 0 4px 4px 0;
}
.franja-success { background: var(--ion-color-success); }
.franja-warning { background: var(--ion-color-warning); }
.franja-danger  { background: var(--ion-color-danger);  }
.franja-medium  { background: #ccc; }

/* Tinte de fila */
.dia-bg-success { background: rgba(var(--ion-color-success-rgb), .04); }
.dia-bg-warning { background: rgba(var(--ion-color-warning-rgb), .06); }
.dia-bg-danger  { background: rgba(var(--ion-color-danger-rgb),  .05); }

.dia-icono { font-size: 34px; margin-right: 12px; flex-shrink: 0; line-height: 1; }

.dia-texto { flex: 1; min-width: 0; }
.dia-nombre-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px;
}
.dia-nombre { font-size: 15px; font-weight: 700; color: var(--ion-color-dark); text-transform: capitalize; }

/* Badge de probabilidad lluvia/sol */
.dia-prob-badge {
  font-size: 11px; font-weight: 700; padding: 2px 8px;
  border-radius: 20px; white-space: nowrap;
}
.prob-danger  { background: rgba(var(--ion-color-danger-rgb),.15);  color: var(--ion-color-danger-shade); }
.prob-warning { background: rgba(var(--ion-color-warning-rgb),.18); color: #7a5800; }
.prob-success { background: rgba(var(--ion-color-success-rgb),.15); color: var(--ion-color-success-shade); }
.prob-medium  { background: rgba(0,0,0,.07); color: var(--ion-color-medium); }

.dia-tip {
  font-size: 12px; color: var(--ion-color-medium-shade);
  display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.dia-temps { display: flex; flex-direction: column; align-items: flex-end; margin: 0 8px; flex-shrink: 0; }
.temp-max  { font-size: 17px; font-weight: 800; color: var(--ion-color-dark); }
.temp-min  { font-size: 13px; color: var(--ion-color-medium); }
.dia-arrow { font-size: 16px; flex-shrink: 0; }

/* ══ HORAS ════════════════════════════════════════════════════════════════════ */
.horas-scroll-wrap { overflow-x: auto; padding: 0 12px 14px; -webkit-overflow-scrolling: touch; }
.horas-scroll      { display: flex; gap: 6px; width: max-content; }
.hora-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 10px; background: var(--ion-color-light); border-radius: 12px; min-width: 52px;
}
.hora-time   { font-size: 11px; color: var(--ion-color-medium); }
.hora-emoji  { font-size: 22px; }
.hora-temp   { font-size: 13px; font-weight: 700; color: var(--ion-color-dark); }
.hora-lluvia { font-size: 10px; color: var(--ion-color-primary); font-weight: 600; }

/* ══ ALERTAS OFICIALES ════════════════════════════════════════════════════════ */
.alerta-card  { margin: 0 12px 10px; border-left: 4px solid var(--ion-color-danger); border-radius: 12px; }
.alerta-title { font-size: 15px; display: flex; align-items: center; gap: 6px; }

/* ══ MODAL DETALLE ════════════════════════════════════════════════════════════ */
.detalle-hero {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px; border-radius: 14px; margin-bottom: 16px;
}
.detalle-success { background: #eaf7ed; }
.detalle-warning { background: #fff8e1; }
.detalle-danger  { background: #fdecea; }
.detalle-medium  { background: var(--ion-color-light); }
.detalle-emoji  { font-size: 44px; flex-shrink: 0; }
.detalle-titulo { font-size: 15px; font-weight: 700; color: var(--ion-color-dark); margin: 0 0 4px; }
.detalle-resumen{ font-size: 13px; color: #555; margin: 0; line-height: 1.45; }

/* Barra de probabilidad */
.prob-banner {
  border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;
  background: var(--ion-color-light);
}
.prob-banner.prob-danger  { background: rgba(var(--ion-color-danger-rgb),.08); }
.prob-banner.prob-warning { background: rgba(var(--ion-color-warning-rgb),.1); }
.prob-banner.prob-success { background: rgba(var(--ion-color-success-rgb),.08); }

.prob-num  { font-size: 32px; font-weight: 900; color: var(--ion-color-dark); }
.prob-lbl  { font-size: 13px; color: var(--ion-color-medium); margin-left: 6px; }
.prob-bar  { height: 6px; background: rgba(0,0,0,.1); border-radius: 3px; margin-top: 8px; overflow: hidden; }
.prob-fill { height: 100%; border-radius: 3px; background: var(--ion-color-primary); transition: width .4s; }

.detalle-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;
}
.detalle-stat {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: var(--ion-color-light); border-radius: 12px; padding: 12px 8px;
}
.ds-icon { font-size: 22px; }
.ds-val  { font-size: 14px; font-weight: 700; color: var(--ion-color-dark); }
.detalle-stat small { font-size: 11px; color: var(--ion-color-medium); }

.detalle-lista-wrap { margin-bottom: 14px; }
.detalle-list-title { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
.detalle-list-title.ok    { color: var(--ion-color-success); }
.detalle-list-title.mal   { color: var(--ion-color-danger); }
.detalle-list-title.tareas{ color: var(--ion-color-primary); margin-top: 14px; }

.detalle-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip     { font-size: 12px; padding: 4px 12px; border-radius: 20px; }
.chip-ok  { background: rgba(var(--ion-color-success-rgb),.15); color: var(--ion-color-success-shade); }
.chip-mal { background: rgba(var(--ion-color-danger-rgb),.12);  color: var(--ion-color-danger-shade); }

.tarea-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--ion-color-light-shade); }
.tr-tipo   { display: block; font-size: 14px; font-weight: 600; color: var(--ion-color-dark); }
.tr-estado { display: block; font-size: 12px; color: var(--ion-color-medium); text-transform: capitalize; }

/* ══ ESTADO SIN DATOS ════════════════════════════════════════════════════════ */
.no-datos-wrap {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 40px 20px; gap: 14px; min-height: 75vh; color: var(--ion-color-dark);
}
.no-datos-emoji { font-size: 72px; }
.no-datos-wrap h2 { font-size: 22px; font-weight: 700; margin: 0; }
.no-datos-msg { font-size: 14px; color: var(--ion-color-medium); margin: 0; line-height: 1.6; }
.error-chip   { background: rgba(var(--ion-color-danger-rgb),.1); color: var(--ion-color-danger); font-size: 13px; padding: 8px 14px; border-radius: 20px; }
.btn-obtener  { width: 100%; max-width: 280px; }
.o-divider {
  display: flex; align-items: center; gap: 10px;
  color: var(--ion-color-medium); font-size: 13px; width: 100%; max-width: 280px;
}
.o-divider::before, .o-divider::after { content:''; flex:1; border-top: 1px solid var(--ion-color-light-shade); }
.busqueda-inline { width: 100%; max-width: 400px; }
.resultados-lista{ border-radius: 12px; overflow: hidden; }
.sin-resultados  { font-size: 13px; color: var(--ion-color-medium); padding: 6px 0; }
.offline-aviso {
  display: flex; align-items: center; gap: 10px;
  background: rgba(0,0,0,.06); border-radius: 12px; padding: 14px 18px;
  font-size: 14px; color: var(--ion-color-medium); max-width: 320px; text-align: left;
}
.offline-aviso ion-icon { font-size: 24px; flex-shrink: 0; }
.state-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px; gap: 14px; }
</style>
