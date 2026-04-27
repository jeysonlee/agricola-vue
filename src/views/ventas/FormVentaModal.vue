<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="$emit('cancel')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Editar' : 'Nueva' }} Venta</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="guardar" :disabled="saving || !isFormValid">
            <ion-spinner v-if="saving" name="crescent" />
            <ion-icon v-else slot="icon-only" :icon="checkmarkOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- ══ MODO EDICIÓN: sólo cabecera ══ -->
      <template v-if="isEdit">
        <ion-card>
          <ion-card-header>
            <ion-card-title class="section-title">Datos de la venta</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item button @click="abrirFecha">
              <ion-label position="stacked">Fecha de venta</ion-label>
              <ion-input :value="formatDisplay(form.fecha_venta)" readonly placeholder="dd/mm/yyyy" />
              <ion-icon :icon="calendarOutline" slot="end" color="medium" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Comprador</ion-label>
              <ion-input v-model="form.comprador" placeholder="Nombre del comprador" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Vendedor</ion-label>
              <ion-input v-model="form.vendedor" placeholder="Nombre del vendedor" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Lugar de venta</ion-label>
              <ion-input v-model="form.lugar_venta" placeholder="Ej: finca, mercado..." />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Precio por kg (S/.)</ion-label>
              <ion-input v-model.number="form.precio_kg" inputmode="decimal" placeholder="0.00" @ionInput="calcTotal" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Observaciones</ion-label>
              <ion-textarea v-model="form.observaciones" :rows="2" />
            </ion-item>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- ══ MODO NUEVO ══ -->
      <template v-else>

        <!-- 1. Seleccionar cosechas -->
        <ion-card>
          <ion-card-header>
            <ion-card-title class="section-title">
              <ion-icon :icon="archiveOutline" /> Cosechas a vender
            </ion-card-title>
          </ion-card-header>
          <ion-card-content style="padding:0">
            <div v-if="loadingCosechas" class="loading-placeholder">
              <ion-spinner name="crescent" />
            </div>
            <div v-else-if="cosechasDisponibles.length === 0" class="empty-cosechas">
              <ion-icon :icon="archiveOutline" />
              <p>No hay cosechas con stock disponible</p>
            </div>
            <ion-list v-else lines="full" style="margin:0">
              <ion-item v-for="c in cosechasDisponibles" :key="c.id">
                <ion-checkbox
                  slot="start"
                  :checked="cosechasSelected.has(c.id)"
                  @ionChange="toggleCosecha(c.id)"
                />
                <ion-label>
                  <h3>{{ parcelaNombre(c.parcela_id) }}</h3>
                  <p>{{ formatDate(c.fecha_cosecha) }} · {{ c.kg_bruto_disponible }}kg b / {{ c.kg_seco_disponible }}kg s</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <div v-if="cosechasEnVenta.length > 0" class="aprox-row">
              <span>Aproximado total:</span>
              <span><strong>{{ kgBrutoAprox.toFixed(2) }}kg</strong> bruto · <strong>{{ kgSecoAprox.toFixed(2) }}kg</strong> seco</span>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- 2. Datos de venta -->
        <ion-card>
          <ion-card-header>
            <ion-card-title class="section-title">
              <ion-icon :icon="cashOutline" /> Datos de venta
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item button @click="abrirFecha">
              <ion-label position="stacked">Fecha de venta *</ion-label>
              <ion-input :value="formatDisplay(form.fecha_venta)" readonly placeholder="dd/mm/yyyy" />
              <ion-icon :icon="calendarOutline" slot="end" color="medium" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Comprador</ion-label>
              <ion-input v-model="form.comprador" placeholder="Nombre del comprador" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Vendedor</ion-label>
              <ion-input v-model="form.vendedor" placeholder="Nombre del vendedor" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Lugar de venta</ion-label>
              <ion-input v-model="form.lugar_venta" placeholder="Ej: finca, mercado..." />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- 3. Kilajes reales -->
        <ion-card>
          <ion-card-header>
            <ion-card-title class="section-title">
              <ion-icon :icon="scaleOutline" /> Kilajes reales
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Estado de humedad</ion-label>
              <ion-segment v-model="form.estado_humedad" slot="end" style="max-width:180px">
                <ion-segment-button value="SECO"><ion-label>SECO</ion-label></ion-segment-button>
                <ion-segment-button value="FRESCO"><ion-label>FRESCO</ion-label></ion-segment-button>
              </ion-segment>
            </ion-item>
            <ion-item v-if="form.estado_humedad === 'FRESCO'">
              <ion-label position="stacked">Descuento por humedad (%)</ion-label>
              <ion-input v-model.number="form.desc_humedad" inputmode="decimal" placeholder="0" @ionInput="calcKgSeco" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Kg bruto (del comprador)</ion-label>
              <ion-input v-model.number="form.kg_bruto" inputmode="decimal" :placeholder="kgBrutoAprox.toFixed(2)" @ionInput="calcKgSeco" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Kg seco / vendido</ion-label>
              <ion-input v-model.number="form.kg_seco" inputmode="decimal" placeholder="0.00" @ionInput="calcTotal" />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- 4. Precio y total -->
        <ion-card>
          <ion-card-header>
            <ion-card-title class="section-title">
              <ion-icon :icon="cashOutline" /> Precio
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label position="stacked">Precio por kg (S/.)</ion-label>
              <ion-input v-model.number="form.precio_kg" inputmode="decimal" placeholder="0.00" @ionInput="calcTotal" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Observaciones</ion-label>
              <ion-textarea v-model="form.observaciones" :rows="2" />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Total -->
        <ion-card color="success" class="total-card">
          <ion-card-content>
            <div class="total-row">
              <span>Kg vendidos</span>
              <span>{{ (+form.kg_seco || 0).toFixed(2) }} kg</span>
            </div>
            <div class="total-row">
              <span>Precio/kg</span>
              <span>S/ {{ (+form.precio_kg || 0).toFixed(2) }}</span>
            </div>
            <div class="total-row total-final">
              <span>Total venta</span>
              <span>S/ {{ totalVenta.toFixed(2) }}</span>
            </div>
          </ion-card-content>
        </ion-card>

      </template>

    </ion-content>

    <!-- Modal fecha -->
    <ion-modal :is-open="fechaOpen" @didDismiss="fechaOpen=false" :breakpoints="[0,0.6]" :initial-breakpoint="0.6">
      <ion-content class="ion-padding" style="--background: var(--ion-background-color)">
        <ion-datetime
          class="datetime-tema"
          v-model="tempFecha"
          presentation="date"
          locale="es-PE"
          :first-day-of-week="1"
          show-default-buttons
          done-text="Confirmar"
          cancel-text="Cancelar"
          @ionChange="confirmarFecha"
        />
      </ion-content>
    </ion-modal>

  </ion-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonTextarea, IonCheckbox,
  IonSegment, IonSegmentButton, IonSpinner, IonDatetime, IonModal,
  toastController,
} from '@ionic/vue'
import {
  closeOutline, checkmarkOutline, archiveOutline, cashOutline,
  calendarOutline, scaleOutline,
} from 'ionicons/icons'
import { useVentas } from '../../composables/useVentas'
import { useCosechas } from '../../composables/useCosechas'
import { useParcelas } from '../../composables/useParcelas'

const props = defineProps({ venta: { type: Object, default: null } })
const emit  = defineEmits(['saved', 'cancel'])

const { crearConDetalles, editar } = useVentas()
const { disponibles: getCosechasDisponibles } = useCosechas()
const { getAll: getParcelas } = useParcelas()

const saving             = ref(false)
const loadingCosechas    = ref(false)
const cosechasDisponibles = ref([])
const parcelas           = ref([])
const cosechasSelected   = ref(new Set())
const isEdit             = computed(() => !!props.venta)

const form = ref({
  fecha_venta:    new Date().toISOString().substring(0, 10),
  comprador:      '',
  vendedor:       '',
  lugar_venta:    '',
  estado_humedad: 'SECO',
  desc_humedad:   0,
  kg_bruto:       0,
  kg_seco:        0,
  precio_kg:      0,
  observaciones:  '',
})

const fechaOpen = ref(false)
const tempFecha = ref('')

const cosechasEnVenta  = computed(() => cosechasDisponibles.value.filter(c => cosechasSelected.value.has(c.id)))
const kgBrutoAprox     = computed(() => cosechasEnVenta.value.reduce((s, c) => s + +(c.kg_bruto_disponible || 0), 0))
const kgSecoAprox      = computed(() => cosechasEnVenta.value.reduce((s, c) => s + +(c.kg_seco_disponible  || 0), 0))
const totalVenta       = computed(() => (+form.value.kg_seco || 0) * (+form.value.precio_kg || 0))

const isFormValid = computed(() => {
  if (isEdit.value) return !!form.value.fecha_venta
  return cosechasEnVenta.value.length > 0 && !!form.value.fecha_venta && (+form.value.precio_kg > 0)
})

watch(() => props.venta, (val) => {
  if (val) {
    form.value = {
      fecha_venta:    val.fecha_venta    ? val.fecha_venta.substring(0, 10)    : new Date().toISOString().substring(0, 10),
      comprador:      val.comprador      || '',
      vendedor:       val.vendedor       || '',
      lugar_venta:    val.lugar_venta    || '',
      estado_humedad: val.estado_humedad || 'SECO',
      desc_humedad:   val.desc_humedad   || 0,
      kg_bruto:       val.kg_bruto       || 0,
      kg_seco:        val.kg_seco        || 0,
      precio_kg:      val.precio_kg      || 0,
      observaciones:  val.observaciones  || '',
    }
  }
}, { immediate: true })

async function loadCosechas() {
  loadingCosechas.value = true
  try {
    const [c, p] = await Promise.all([getCosechasDisponibles(), getParcelas()])
    cosechasDisponibles.value = c
    parcelas.value = p
  } finally {
    loadingCosechas.value = false
  }
}

function toggleCosecha(id) {
  const s = new Set(cosechasSelected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  cosechasSelected.value = s
}

function parcelaNombre(parcela_id) {
  return parcelas.value.find(p => p.id === parcela_id)?.nombre || '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.substring(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formatDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.substring(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function abrirFecha() {
  tempFecha.value = form.value.fecha_venta ? form.value.fecha_venta + 'T00:00:00' : new Date().toISOString().substring(0, 10) + 'T00:00:00'
  fechaOpen.value = true
}

function confirmarFecha(ev) {
  const val = ev?.detail?.value || tempFecha.value
  if (!val) return
  form.value.fecha_venta = (typeof val === 'string' ? val : val.toString()).substring(0, 10)
  fechaOpen.value = false
}

function calcKgSeco() {
  if (form.value.estado_humedad === 'FRESCO') {
    const desc = (+form.value.desc_humedad || 0) / 100
    form.value.kg_seco = round2((+form.value.kg_bruto || 0) * (1 - desc))
  } else {
    form.value.kg_seco = +(form.value.kg_bruto || 0)
  }
  calcTotal()
}

function calcTotal() {}

function round2(v) { return Math.round(v * 100) / 100 }

// Distribuye kg_bruto y kg_seco proporcionalmente entre cosechas seleccionadas
function calcularDetalles(ventaId) {
  const cosechas = cosechasEnVenta.value
  const totalBrutoAprox = kgBrutoAprox.value
  const totalSecoAprox  = kgSecoAprox.value
  const kgBrutoReal = +form.value.kg_bruto || 0
  const kgSecoReal  = +form.value.kg_seco  || 0
  const precioKg    = +form.value.precio_kg || 0

  return cosechas.map((c, idx) => {
    const esCierre = idx === cosechas.length - 1

    const propBruto = totalBrutoAprox > 0 ? (+(c.kg_bruto_disponible || 0)) / totalBrutoAprox : (1 / cosechas.length)
    const propSeco  = totalSecoAprox  > 0 ? (+(c.kg_seco_disponible  || 0)) / totalSecoAprox  : (1 / cosechas.length)

    const kgBrutoAsignado = esCierre
      ? round2(kgBrutoReal - cosechas.slice(0, idx).reduce((s, _, i) => s + round2((totalBrutoAprox > 0 ? (+(cosechas[i].kg_bruto_disponible || 0)) / totalBrutoAprox : 1 / cosechas.length) * kgBrutoReal), 0))
      : round2(propBruto * kgBrutoReal)

    const kgSecoAsignado = esCierre
      ? round2(kgSecoReal - cosechas.slice(0, idx).reduce((s, _, i) => s + round2((totalSecoAprox > 0 ? (+(cosechas[i].kg_seco_disponible || 0)) / totalSecoAprox : 1 / cosechas.length) * kgSecoReal), 0))
      : round2(propSeco * kgSecoReal)

    return {
      cosecha_id:             c.id,
      parcela_id:             c.parcela_id,
      kg_bruto:               kgBrutoAsignado,
      kg_seco:                kgSecoAsignado,
      kg_bruto_disponible:    +(c.kg_bruto_disponible || 0),
      kg_seco_disponible:     +(c.kg_seco_disponible  || 0),
      porcentaje_total_venta: round2(propSeco * 100),
      cantidad_vendida_kg:    kgSecoAsignado,
      subtotal:               round2(kgSecoAsignado * precioKg),
    }
  })
}

async function guardar() {
  if (!isFormValid.value) return
  saving.value = true
  try {
    if (isEdit.value) {
      await editar(props.venta.id, {
        fecha_venta:    form.value.fecha_venta,
        comprador:      form.value.comprador,
        vendedor:       form.value.vendedor,
        lugar_venta:    form.value.lugar_venta,
        precio_kg:      +form.value.precio_kg,
        total_venta:    round2((+form.value.kg_seco || 0) * (+form.value.precio_kg || 0)),
        observaciones:  form.value.observaciones,
      })
    } else {
      const kgSecoFinal  = +form.value.kg_seco  || 0
      const kgBrutoFinal = +form.value.kg_bruto || 0
      const precioKg     = +form.value.precio_kg || 0

      const ventaData = {
        fecha_venta:          form.value.fecha_venta,
        comprador:            form.value.comprador,
        vendedor:             form.value.vendedor,
        lugar_venta:          form.value.lugar_venta,
        estado_humedad:       form.value.estado_humedad,
        kg_bruto_aproximados: kgBrutoAprox.value,
        kg_seco_aproximados:  kgSecoAprox.value,
        kg_bruto:             kgBrutoFinal,
        kg_seco:              kgSecoFinal,
        desc_humedad:         +form.value.desc_humedad || 0,
        cantidad_vendida_kg:  kgSecoFinal,
        precio_kg:            precioKg,
        total_venta:          round2(kgSecoFinal * precioKg),
        observaciones:        form.value.observaciones,
      }

      const detalles = calcularDetalles()

      await crearConDetalles({ ventaData, detalles })
    }

    emit('saved')
  } catch (e) {
    const t = await toastController.create({ message: 'Error: ' + e.message, duration: 2500, color: 'danger', position: 'top' })
    t.present()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!isEdit.value) loadCosechas()
})
</script>

<style scoped>
.section-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.section-title ion-icon { font-size: 1.1rem; }

.loading-placeholder { display: flex; justify-content: center; padding: 24px; }

.empty-cosechas {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px; gap: 8px; color: var(--ion-color-medium);
}
.empty-cosechas ion-icon { font-size: 40px; }

.aprox-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px;
  background: var(--ion-color-light);
  font-size: 0.82rem; color: var(--ion-color-medium);
}

.total-card { margin-bottom: 24px; }
.total-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: rgba(255,255,255,0.85); font-size: 0.85rem; }
.total-final {
  border-top: 1px solid rgba(255,255,255,0.35);
  padding-top: 10px; margin-top: 4px; margin-bottom: 0;
  color: white; font-size: 1rem; font-weight: 700;
}
.total-final span:last-child { font-size: 1.3rem; font-weight: 800; }

@media (prefers-color-scheme: light) {
  .datetime-tema { --ion-color-primary: #174437; }
}
@media (prefers-color-scheme: dark) {
  .datetime-tema { --ion-color-primary: #54b69a; }
}
</style>
