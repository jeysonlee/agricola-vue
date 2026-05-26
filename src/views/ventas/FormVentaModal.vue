<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ isEdit ? 'Editar' : 'Nueva' }} Venta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content">

      <!-- ══ MODO EDICIÓN ══ -->
      <template v-if="isEdit">
        <p class="fsec-label">Datos de la venta</p>
        <ion-list inset class="fsec-list">
          <ion-item button @click="abrirFecha">
            <ion-icon :icon="calendarOutline" slot="start" color="primary" class="item-icon" />
            <ion-label position="stacked">Fecha de venta</ion-label>
            <ion-input :value="formatDisplay(form.fecha_venta)" readonly placeholder="dd/mm/yyyy" />
            <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
          </ion-item>
          <ion-item>
            <ion-icon :icon="personOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Comprador</ion-label>
            <ion-input v-model="form.comprador" placeholder="Nombre del comprador" />
          </ion-item>
          <ion-item>
            <ion-icon :icon="personOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Vendedor</ion-label>
            <ion-input v-model="form.vendedor" placeholder="Nombre del vendedor" />
          </ion-item>
          <ion-item>
            <ion-icon :icon="locationOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Lugar de venta</ion-label>
            <ion-input v-model="form.lugar_venta" placeholder="Ej: finca, mercado..." />
          </ion-item>
          <ion-item>
            <ion-icon :icon="cashOutline" slot="start" color="success" class="item-icon" />
            <ion-label position="stacked">Precio por kg (S/.)</ion-label>
            <ion-input v-model.number="form.precio_kg" inputmode="decimal" placeholder="0.00" />
          </ion-item>
          <ion-item lines="none">
            <ion-icon :icon="chatboxOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Observaciones</ion-label>
            <ion-textarea v-model="form.observaciones" :rows="2" />
          </ion-item>
        </ion-list>
      </template>

      <!-- ══ MODO NUEVO ══ -->
      <template v-else>

        <!-- 1. Selección de cosechas (multi) -->
        <p class="fsec-label">Cosechas a vender</p>

        <div v-if="loadingCosechas" class="loading-placeholder">
          <ion-spinner name="crescent" />
        </div>
        <div v-else-if="cosechasDisponibles.length === 0" class="empty-cosechas">
          <ion-icon :icon="archiveOutline" />
          <p>No hay cosechas con stock disponible</p>
        </div>
        <div v-else class="cosecha-list">
          <div
            v-for="c in cosechasDisponibles"
            :key="c.id"
            class="cosecha-card"
            :class="{ selected: cosechasSelected.has(c.id) }"
            @click="toggleCosecha(c.id)"
          >
            <div class="cosecha-card-top">
              <div>
                <p class="cosecha-parcela">{{ parcelaNombre(c.parcela_id) }}</p>
                <p class="cosecha-fecha">{{ formatDate(c.fecha_cosecha) }}</p>
              </div>
              <div class="cosecha-check-wrap">
                <ion-icon
                  :icon="cosechasSelected.has(c.id) ? checkmarkCircleOutline : ellipseOutline"
                  :color="cosechasSelected.has(c.id) ? 'success' : 'medium'"
                  class="cosecha-check"
                />
              </div>
            </div>
            <div class="cosecha-kg-row">
              <span class="cosecha-kg-pill bruto">{{ (+c.kg_bruto_disponible || 0).toFixed(1) }} kg bruto</span>
              <span class="cosecha-kg-pill seco">{{ (+c.kg_seco_disponible || 0).toFixed(1) }} kg seco</span>
              <span class="cosecha-merma">merma {{ c.pctj_merma ?? 60 }}%</span>
            </div>
          </div>

          <!-- Barra de totales seleccionados -->
          <div v-if="cosechasEnVenta.length > 0" class="seleccion-bar">
            <span class="seleccion-count">
              <ion-icon :icon="checkmarkCircleOutline" color="success" />
              {{ cosechasEnVenta.length }} cosecha{{ cosechasEnVenta.length > 1 ? 's' : '' }} seleccionada{{ cosechasEnVenta.length > 1 ? 's' : '' }}
            </span>
            <span class="seleccion-totales">
              {{ kgBrutoAprox.toFixed(1) }} kg b · {{ kgSecoAprox.toFixed(1) }} kg s
            </span>
          </div>
        </div>

        <!-- 2..6 solo si hay al menos una cosecha seleccionada -->
        <template v-if="cosechasEnVenta.length > 0">

          <!-- 2. Tipo de venta -->
          <p class="fsec-label">Tipo de venta</p>
          <ion-list inset class="fsec-list">
            <ion-item lines="none">
              <ion-icon :icon="swapHorizontalOutline" slot="start" color="primary" class="item-icon" />
              <ion-label>Modalidad</ion-label>
              <ion-segment v-model="form.tipo_venta" slot="end" style="max-width: 185px">
                <ion-segment-button value="PARCIAL"><ion-label>Parcial</ion-label></ion-segment-button>
                <ion-segment-button value="TOTAL"><ion-label>Total</ion-label></ion-segment-button>
              </ion-segment>
            </ion-item>
          </ion-list>
          <p v-if="form.tipo_venta === 'TOTAL'" class="fsec-hint">
            Todas las cosechas seleccionadas quedarán en 0 disponible.
            Los kg reales son opcionales para el registro financiero.
          </p>

          <!-- 3. Kilajes -->
          <p class="fsec-label">Kilajes reales vendidos</p>
          <ion-list inset class="fsec-list">

            <!-- PARCIAL -->
            <template v-if="form.tipo_venta === 'PARCIAL'">
              <ion-item>
                <ion-icon :icon="scaleOutline" slot="start" color="medium" class="item-icon" />
                <ion-label>Ingresar en</ion-label>
                <ion-segment v-model="form.modo_kg" slot="end" style="max-width: 165px">
                  <ion-segment-button value="BRUTO"><ion-label>Bruto</ion-label></ion-segment-button>
                  <ion-segment-button value="SECO"><ion-label>Seco</ion-label></ion-segment-button>
                </ion-segment>
              </ion-item>

              <ion-item v-if="form.modo_kg === 'BRUTO'">
                <ion-icon :icon="scaleOutline" slot="start" color="success" class="item-icon" />
                <ion-label position="stacked">
                  Kg bruto total vendido
                  <span class="label-disp">(máx. {{ kgBrutoAprox.toFixed(1) }} kg)</span>
                </ion-label>
                <ion-input
                  :value="form.kg_bruto"
                  type="number"
                  inputmode="decimal"
                  placeholder="0.00"
                  @ionInput="e => { form.kg_bruto = parseFloat(e.detail.value) || null }"
                />
              </ion-item>
              <ion-item v-else>
                <ion-icon :icon="scaleOutline" slot="start" color="primary" class="item-icon" />
                <ion-label position="stacked">
                  Kg seco total vendido
                  <span class="label-disp">(máx. {{ kgSecoAprox.toFixed(1) }} kg)</span>
                </ion-label>
                <ion-input
                  :value="form.kg_seco"
                  type="number"
                  inputmode="decimal"
                  placeholder="0.00"
                  @ionInput="e => { form.kg_seco = parseFloat(e.detail.value) || null }"
                />
              </ion-item>

              <!-- Aviso si supera disponible -->
              <ion-item v-if="superaDisponible" lines="none" class="aviso-item">
                <ion-icon :icon="warningOutline" slot="start" color="warning" class="item-icon" />
                <ion-label>
                  <p class="aviso-text">Supera el stock disponible</p>
                </ion-label>
              </ion-item>

              <!-- Preview del valor calculado -->
              <ion-item v-else-if="kgBrutoFinal > 0 || kgSecoFinal > 0" lines="none" class="calc-preview-item">
                <ion-icon :icon="informationCircleOutline" slot="start" color="medium" class="item-icon" />
                <ion-label>
                  <p v-if="form.modo_kg === 'BRUTO'" class="calc-result">
                    Seco estimado: <strong>{{ kgSecoFinal.toFixed(2) }} kg</strong>
                  </p>
                  <p v-else class="calc-result">
                    Bruto estimado: <strong>{{ kgBrutoFinal.toFixed(2) }} kg</strong>
                  </p>
                  <p v-if="cosechasEnVenta.length > 1" class="calc-merma">
                    Distribuido proporcionalmente · merma individual por cosecha
                  </p>
                  <p v-else class="calc-merma">
                    Merma aplicada: {{ cosechasEnVenta[0]?.pctj_merma ?? 60 }}%
                  </p>
                </ion-label>
              </ion-item>
            </template>

            <!-- TOTAL: kg opcionales para registro financiero -->
            <template v-else>
              <ion-item>
                <ion-icon :icon="scaleOutline" slot="start" color="success" class="item-icon" />
                <ion-label position="stacked">Kg bruto real total (opcional)</ion-label>
                <ion-input
                  :value="form.kg_bruto"
                  type="number"
                  inputmode="decimal"
                  :placeholder="kgBrutoAprox.toFixed(2)"
                  @ionInput="e => { form.kg_bruto = parseFloat(e.detail.value) || null }"
                />
              </ion-item>
              <ion-item lines="none">
                <ion-icon :icon="scaleOutline" slot="start" color="primary" class="item-icon" />
                <ion-label position="stacked">Kg seco real total (opcional)</ion-label>
                <ion-input
                  :value="form.kg_seco"
                  type="number"
                  inputmode="decimal"
                  :placeholder="kgSecoAprox.toFixed(2)"
                  @ionInput="e => { form.kg_seco = parseFloat(e.detail.value) || null }"
                />
              </ion-item>
            </template>

          </ion-list>

          <!-- 4. Datos de la venta -->
          <p class="fsec-label">Datos de la venta</p>
          <ion-list inset class="fsec-list">
            <ion-item button @click="abrirFecha">
              <ion-icon :icon="calendarOutline" slot="start" color="primary" class="item-icon" />
              <ion-label position="stacked">Fecha de venta *</ion-label>
              <ion-input :value="formatDisplay(form.fecha_venta)" readonly placeholder="dd/mm/yyyy" />
              <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
            </ion-item>
            <ion-item>
              <ion-icon :icon="personOutline" slot="start" color="medium" class="item-icon" />
              <ion-label position="stacked">Comprador</ion-label>
              <ion-input v-model="form.comprador" placeholder="Nombre del comprador" />
            </ion-item>
            <ion-item>
              <ion-icon :icon="personOutline" slot="start" color="medium" class="item-icon" />
              <ion-label position="stacked">Vendedor</ion-label>
              <ion-input v-model="form.vendedor" placeholder="Nombre del vendedor" />
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="locationOutline" slot="start" color="medium" class="item-icon" />
              <ion-label position="stacked">Lugar de venta</ion-label>
              <ion-input v-model="form.lugar_venta" placeholder="Ej: finca, mercado..." />
            </ion-item>
          </ion-list>

          <!-- 5. Precio -->
          <p class="fsec-label">Precio</p>
          <ion-list inset class="fsec-list">
            <ion-item>
              <ion-icon :icon="cashOutline" slot="start" color="success" class="item-icon" />
              <ion-label position="stacked">Precio por kg (S/.)</ion-label>
              <ion-input v-model.number="form.precio_kg" inputmode="decimal" placeholder="0.00" />
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="chatboxOutline" slot="start" color="medium" class="item-icon" />
              <ion-label position="stacked">Observaciones</ion-label>
              <ion-textarea v-model="form.observaciones" :rows="2" />
            </ion-item>
          </ion-list>

          <!-- 6. Resumen -->
          <div class="totales-box totales-real">
            <p class="totales-tag">Resumen de venta</p>
            <div class="total-line">
              <span>Cosechas</span>
              <span>{{ cosechasEnVenta.length }} seleccionada{{ cosechasEnVenta.length > 1 ? 's' : '' }}</span>
            </div>
            <div class="total-line">
              <span>Modalidad</span>
              <span class="badge-modal" :class="form.tipo_venta === 'TOTAL' ? 'badge-total' : 'badge-parcial'">
                {{ form.tipo_venta }}
              </span>
            </div>
            <div class="total-line"><span>Kg bruto</span><span>{{ kgBrutoFinal.toFixed(2) }} kg</span></div>
            <div class="total-line"><span>Kg seco</span><span>{{ kgSecoFinal.toFixed(2) }} kg</span></div>
            <div class="total-line"><span>Precio/kg</span><span>S/ {{ (+form.precio_kg || 0).toFixed(2) }}</span></div>
            <div class="total-line total-line--final">
              <span>Total venta</span>
              <span>S/ {{ totalVenta.toFixed(2) }}</span>
            </div>
          </div>

        </template>
      </template>

    </ion-content>

    <!-- ══ ACCIÓN GUARDAR / CANCELAR ══ -->
    <ion-footer class="action-footer">
      <ion-toolbar>
        <div class="action-bar">
          <ion-button expand="block" fill="outline" color="medium" @click="$emit('cancel')">
            <ion-icon slot="start" :icon="closeOutline" /> Cancelar
          </ion-button>
          <ion-button expand="block" fill="solid" color="success" @click="guardar" :disabled="saving || !isFormValid">
            <ion-spinner v-if="saving" name="crescent" slot="start" style="width:18px;height:18px" />
            <ion-icon v-else slot="start" :icon="saveOutline" />
            Guardar
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>

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
  IonPage, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonTextarea,
  IonSegment, IonSegmentButton, IonSpinner, IonDatetime, IonModal, IonFooter,
  toastController,
} from '@ionic/vue'
import {
  closeOutline, saveOutline, archiveOutline, cashOutline, calendarOutline, scaleOutline,
  chevronForwardOutline, personOutline, locationOutline, chatboxOutline,
  checkmarkCircleOutline, ellipseOutline, informationCircleOutline,
  swapHorizontalOutline, warningOutline,
} from 'ionicons/icons'
import { useVentas }   from '../../composables/useVentas'
import { useCosechas } from '../../composables/useCosechas'
import { useParcelas } from '../../composables/useParcelas'
import { useAcceso }   from '../../composables/useAcceso'

const props = defineProps({ venta: { type: Object, default: null } })
const emit  = defineEmits(['saved', 'cancel'])

const { crearConDetalles, editar } = useVentas()
const { disponiblesByParcelas }    = useCosechas()
const { getAll: getParcelas }      = useParcelas()
const { getParcelaIds }            = useAcceso()

const saving              = ref(false)
const loadingCosechas     = ref(false)
const cosechasDisponibles = ref([])
const parcelas            = ref([])
const cosechasSelected    = ref(new Set())
const isEdit              = computed(() => !!props.venta)

const form = ref({
  fecha_venta:   new Date().toISOString().substring(0, 10),
  comprador:     '',
  vendedor:      '',
  lugar_venta:   '',
  tipo_venta:    'PARCIAL',
  modo_kg:       'BRUTO',
  kg_bruto:      null,
  kg_seco:       null,
  precio_kg:     0,
  observaciones: '',
})

const fechaOpen = ref(false)
const tempFecha = ref('')

// ── Cosechas seleccionadas ──
const cosechasEnVenta = computed(() =>
  cosechasDisponibles.value.filter(c => cosechasSelected.value.has(c.id))
)
const kgBrutoAprox = computed(() =>
  cosechasEnVenta.value.reduce((s, c) => s + +(c.kg_bruto_disponible || 0), 0)
)
const kgSecoAprox = computed(() =>
  cosechasEnVenta.value.reduce((s, c) => s + +(c.kg_seco_disponible || 0), 0)
)

// ── Aviso si el usuario ingresó más de lo disponible ──
const superaDisponible = computed(() => {
  if (form.value.tipo_venta !== 'PARCIAL') return false
  if (form.value.modo_kg === 'BRUTO') return (+form.value.kg_bruto || 0) > kgBrutoAprox.value
  return (+form.value.kg_seco || 0) > kgSecoAprox.value
})

// ── Distribución proporcional entre cosechas ──
function calcularDetalles() {
  const cosechas = cosechasEnVenta.value
  if (!cosechas.length) return []
  const esTotal  = form.value.tipo_venta === 'TOTAL'
  const precioKg = +form.value.precio_kg || 0
  const result   = []

  if (esTotal) {
    const totalSecoDisp = cosechas.reduce((s, c) => s + +(c.kg_seco_disponible || 0), 0)
    for (const c of cosechas) {
      const kgB = +(c.kg_bruto_disponible || 0)
      const kgS = +(c.kg_seco_disponible  || 0)
      const prop = totalSecoDisp > 0 ? kgS / totalSecoDisp : 1 / cosechas.length
      result.push({
        cosecha_id: c.id, parcela_id: c.parcela_id,
        kg_bruto: kgB, kg_seco: kgS,
        kg_bruto_disponible: kgB, kg_seco_disponible: kgS,
        porcentaje_total_venta: round2(prop * 100),
        cantidad_vendida_kg: kgS,
        subtotal: round2(kgS * precioKg),
        es_venta_total: true,
      })
    }
    return result
  }

  // ── PARCIAL ──
  if (form.value.modo_kg === 'BRUTO') {
    const kgBInput       = +form.value.kg_bruto || 0
    const totalBrutoDisp = cosechas.reduce((s, c) => s + +(c.kg_bruto_disponible || 0), 0)
    let remainingB = kgBInput

    for (let i = 0; i < cosechas.length; i++) {
      const c        = cosechas[i]
      const esCierre = i === cosechas.length - 1
      const prop     = totalBrutoDisp > 0 ? +(c.kg_bruto_disponible || 0) / totalBrutoDisp : 1 / cosechas.length
      const kgB_i    = esCierre ? round2(remainingB) : round2(prop * kgBInput)
      if (!esCierre) remainingB -= kgB_i
      const merma_i  = +(c.pctj_merma ?? 60)
      const kgS_i    = round2(kgB_i * (1 - merma_i / 100))
      result.push({
        cosecha_id: c.id, parcela_id: c.parcela_id,
        kg_bruto: kgB_i, kg_seco: kgS_i,
        kg_bruto_disponible: +(c.kg_bruto_disponible || 0),
        kg_seco_disponible:  +(c.kg_seco_disponible  || 0),
        porcentaje_total_venta: round2(prop * 100),
        cantidad_vendida_kg: kgS_i,
        subtotal: round2(kgS_i * precioKg),
        es_venta_total: false,
      })
    }
  } else {
    // modo SECO
    const kgSInput      = +form.value.kg_seco || 0
    const totalSecoDisp = cosechas.reduce((s, c) => s + +(c.kg_seco_disponible || 0), 0)
    let remainingS = kgSInput

    for (let i = 0; i < cosechas.length; i++) {
      const c        = cosechas[i]
      const esCierre = i === cosechas.length - 1
      const prop     = totalSecoDisp > 0 ? +(c.kg_seco_disponible || 0) / totalSecoDisp : 1 / cosechas.length
      const kgS_i    = esCierre ? round2(remainingS) : round2(prop * kgSInput)
      if (!esCierre) remainingS -= kgS_i
      const merma_i  = +(c.pctj_merma ?? 60)
      const factor   = 1 - merma_i / 100
      const kgB_i    = factor > 0 ? round2(kgS_i / factor) : 0
      result.push({
        cosecha_id: c.id, parcela_id: c.parcela_id,
        kg_bruto: kgB_i, kg_seco: kgS_i,
        kg_bruto_disponible: +(c.kg_bruto_disponible || 0),
        kg_seco_disponible:  +(c.kg_seco_disponible  || 0),
        porcentaje_total_venta: round2(prop * 100),
        cantidad_vendida_kg: kgS_i,
        subtotal: round2(kgS_i * precioKg),
        es_venta_total: false,
      })
    }
  }

  return result
}

// ── Totales derivados del cálculo de distribución ──
const detallesPreview = computed(() => calcularDetalles())

const kgBrutoFinal = computed(() => {
  if (form.value.tipo_venta === 'TOTAL') {
    return +form.value.kg_bruto > 0 ? +form.value.kg_bruto : kgBrutoAprox.value
  }
  return round2(detallesPreview.value.reduce((s, d) => s + d.kg_bruto, 0))
})
const kgSecoFinal = computed(() => {
  if (form.value.tipo_venta === 'TOTAL') {
    return +form.value.kg_seco > 0 ? +form.value.kg_seco : kgSecoAprox.value
  }
  return round2(detallesPreview.value.reduce((s, d) => s + d.kg_seco, 0))
})

const totalVenta = computed(() => round2(kgSecoFinal.value * (+form.value.precio_kg || 0)))

const isFormValid = computed(() => {
  if (isEdit.value) return !!form.value.fecha_venta
  if (!cosechasEnVenta.value.length || !form.value.fecha_venta) return false
  if (+form.value.precio_kg <= 0) return false
  if (form.value.tipo_venta === 'TOTAL') return true
  if (superaDisponible.value) return false
  return form.value.modo_kg === 'BRUTO'
    ? (+form.value.kg_bruto || 0) > 0
    : (+form.value.kg_seco  || 0) > 0
})

// Limpiar kg al cambiar modalidad, unidad o selección de cosechas
watch(() => form.value.tipo_venta, () => { form.value.kg_bruto = null; form.value.kg_seco = null })
watch(() => form.value.modo_kg,    () => { form.value.kg_bruto = null; form.value.kg_seco = null })
watch(() => cosechasEnVenta.value.length, () => { form.value.kg_bruto = null; form.value.kg_seco = null })

watch(() => props.venta, (val) => {
  if (val) {
    form.value = {
      fecha_venta:   val.fecha_venta ? val.fecha_venta.substring(0, 10) : new Date().toISOString().substring(0, 10),
      comprador:     val.comprador     || '',
      vendedor:      val.vendedor      || '',
      lugar_venta:   val.lugar_venta   || '',
      tipo_venta:    'PARCIAL',
      modo_kg:       'BRUTO',
      kg_bruto:      val.kg_bruto      || 0,
      kg_seco:       val.kg_seco       || 0,
      precio_kg:     val.precio_kg     || 0,
      observaciones: val.observaciones || '',
    }
  }
}, { immediate: true })

async function loadCosechas() {
  loadingCosechas.value = true
  try {
    const [ids, p] = await Promise.all([getParcelaIds(), getParcelas()])
    cosechasDisponibles.value = await disponiblesByParcelas(ids)
    parcelas.value = p
  } finally {
    loadingCosechas.value = false
  }
}

function toggleCosecha(id) {
  const s = new Set(cosechasSelected.value)
  s.has(id) ? s.delete(id) : s.add(id)
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
  tempFecha.value = (form.value.fecha_venta || new Date().toISOString().substring(0, 10)) + 'T00:00:00'
  fechaOpen.value = true
}

function confirmarFecha(ev) {
  const val = ev?.detail?.value || tempFecha.value
  if (!val) return
  form.value.fecha_venta = (typeof val === 'string' ? val : val.toString()).substring(0, 10)
  fechaOpen.value = false
}

function round2(v) { return Math.round(v * 100) / 100 }

async function guardar() {
  if (!isFormValid.value) return
  saving.value = true
  try {
    if (isEdit.value) {
      await editar(props.venta.id, {
        fecha_venta:   form.value.fecha_venta,
        comprador:     form.value.comprador,
        vendedor:      form.value.vendedor,
        lugar_venta:   form.value.lugar_venta,
        precio_kg:     +form.value.precio_kg,
        total_venta:   round2((+form.value.kg_seco || 0) * (+form.value.precio_kg || 0)),
        observaciones: form.value.observaciones,
      })
    } else {
      const detalles = calcularDetalles()
      const kgB      = kgBrutoFinal.value
      const kgS      = kgSecoFinal.value
      const precioKg = +form.value.precio_kg || 0

      const ventaData = {
        fecha_venta:          form.value.fecha_venta,
        comprador:            form.value.comprador,
        vendedor:             form.value.vendedor,
        lugar_venta:          form.value.lugar_venta,
        estado_humedad:       'SECO',
        kg_bruto_aproximados: kgBrutoAprox.value,
        kg_seco_aproximados:  kgSecoAprox.value,
        kg_bruto:             kgB,
        kg_seco:              kgS,
        desc_humedad:         0,
        cantidad_vendida_kg:  kgS,
        precio_kg:            precioKg,
        total_venta:          round2(kgS * precioKg),
        observaciones:        form.value.observaciones,
      }

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

onMounted(() => { if (!isEdit.value) loadCosechas() })
</script>

<style scoped>
.form-content { --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 90px; }

.fsec-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--ion-color-medium); padding: 20px 32px 4px; margin: 0;
}
.fsec-list { margin-bottom: 0 !important; }
.item-icon { font-size: 1.15rem; flex-shrink: 0; }

.fsec-hint {
  font-size: 0.74rem; color: var(--ion-color-medium); padding: 4px 28px 0; margin: 0;
  font-style: italic; line-height: 1.4;
}

/* ── Cosecha cards ── */
.cosecha-list { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }

.cosecha-card {
  background: var(--ion-color-step-100);
  border-radius: 14px;
  padding: 14px 16px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.cosecha-card.selected {
  border-color: var(--ion-color-success);
  background: rgba(var(--ion-color-success-rgb), 0.08);
}

.cosecha-card-top {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;
}
.cosecha-parcela { font-size: 0.95rem; font-weight: 700; color: var(--ion-text-color); margin: 0 0 2px; }
.cosecha-fecha   { font-size: 0.75rem; color: var(--ion-color-medium); margin: 0; }
.cosecha-check-wrap { flex-shrink: 0; padding-top: 2px; }
.cosecha-check   { font-size: 1.4rem; }

.cosecha-kg-row  { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.cosecha-kg-pill {
  font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
}
.cosecha-kg-pill.bruto { background: rgba(var(--ion-color-success-rgb), 0.15); color: var(--ion-color-success-shade); }
.cosecha-kg-pill.seco  { background: rgba(var(--ion-color-primary-rgb),  0.15); color: var(--ion-color-primary-shade); }
.cosecha-merma   { font-size: 0.7rem; color: var(--ion-color-medium); }

/* Barra de selección */
.seleccion-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 2px; padding: 10px 14px;
  background: rgba(var(--ion-color-success-rgb), 0.08);
  border-radius: 12px; border: 1px solid rgba(var(--ion-color-success-rgb), 0.2);
}
.seleccion-count {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.8rem; font-weight: 600; color: var(--ion-color-success-shade);
}
.seleccion-count ion-icon { font-size: 1rem; }
.seleccion-totales { font-size: 0.75rem; color: var(--ion-color-medium); }

/* ── Inputs helpers ── */
.label-disp { color: var(--ion-color-medium); font-size: 0.75em; font-weight: 400; }

.aviso-item { --background: rgba(var(--ion-color-warning-rgb), 0.08); }
.aviso-text { font-size: 0.82rem; color: var(--ion-color-warning-shade); font-weight: 600; margin: 0; }

.calc-preview-item { --background: var(--ion-color-step-50); }
.calc-result  { font-size: 0.88rem; color: var(--ion-text-color); margin: 0 0 2px; }
.calc-merma   { font-size: 0.72rem; color: var(--ion-color-medium); margin: 0; }

/* ── Loading / empty ── */
.loading-placeholder { display: flex; justify-content: center; padding: 32px; }
.empty-cosechas {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px; gap: 8px; color: var(--ion-color-medium);
  margin: 0 16px; border-radius: 14px; background: var(--ion-color-step-100);
}
.empty-cosechas ion-icon { font-size: 40px; }

/* ── Totales ── */
.totales-box { margin: 12px 16px 8px; border-radius: 14px; padding: 16px 18px; }
.totales-real {
  background: rgba(var(--ion-color-success-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-success-rgb), 0.25);
}
.totales-tag { font-size: 0.75rem; font-weight: 600; color: var(--ion-color-medium); margin: 0 0 10px; }
.total-line {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.85rem; color: var(--ion-text-color); margin-bottom: 6px;
}
.total-line--final {
  border-top: 1px solid rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.12);
  padding-top: 10px; margin-top: 4px; margin-bottom: 0;
  font-weight: 700; font-size: 1rem;
}
.total-line--final span:last-child { font-size: 1.25rem; font-weight: 800; }

.badge-modal {
  font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.badge-total   { background: rgba(var(--ion-color-danger-rgb),  0.15); color: var(--ion-color-danger-shade); }
.badge-parcial { background: rgba(var(--ion-color-warning-rgb), 0.15); color: var(--ion-color-warning-shade); }

/* ── Datetime ── */
@media (prefers-color-scheme: light) { .datetime-tema { --ion-color-primary: #174437; } }
@media (prefers-color-scheme: dark)  { .datetime-tema { --ion-color-primary: #54b69a; } }

/* ── Footer ── */
.action-footer ion-toolbar {
  --background: var(--ion-background-color); --border-color: transparent;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
}
.action-bar { display: flex; gap: 12px; padding: 10px 16px 14px; }
.action-bar ion-button { flex: 1; --border-radius: 12px; height: 50px; font-size: 0.95rem; font-weight: 700; }
</style>
