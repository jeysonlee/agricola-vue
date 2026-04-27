<template>
  <ion-page>
    <AppHeader :title="(isEdit ? 'Editar' : 'Nueva') + ' Tarea'" :show-back="true" back-href="/tabs/tareas">
      <template #end>
        <ion-button @click="guardar" :disabled="saving || !isFormValid">
          <ion-spinner v-if="saving" name="crescent" />
          <ion-icon v-else slot="icon-only" :icon="checkmarkOutline" />
        </ion-button>
      </template>
    </AppHeader>

    <ion-content class="ion-padding">

      <!-- ══ 1. DATOS GENERALES ══ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title class="card-title">
            <ion-icon :icon="newspaperOutline" /> Datos Generales
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Tipo de Tarea *</ion-label>
            <ion-select v-model="form.tipo_tarea" placeholder="Seleccionar..." interface="action-sheet">
              <ion-select-option v-for="t in TIPOS_TAREA" :key="t" :value="t">{{ t }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Descripción / detalle</ion-label>
            <ion-input v-model="form.descripcion" placeholder="Detalle de la tarea..." />
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Parcela *</ion-label>
            <ion-select v-model="form.parcela_id" placeholder="Seleccionar..." interface="action-sheet">
              <ion-select-option v-for="p in parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Estado</ion-label>
            <ion-select v-model="form.estado" interface="action-sheet">
              <ion-select-option value="programada">Programada</ion-select-option>
              <ion-select-option value="en_ejecucion">En ejecución</ion-select-option>
              <ion-select-option value="finalizada">Finalizada</ion-select-option>
              <ion-select-option value="cancelada">Cancelada</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-grid style="padding:0">
            <ion-row>
              <ion-col size="6">
                <ion-item button @click="abrirFecha('programada')">
                  <ion-label position="stacked">Fecha programada *</ion-label>
                  <ion-input :value="formatDisplay(form.fecha_programada)" readonly placeholder="dd/mm/yyyy" />
                  <ion-icon :icon="calendarOutline" slot="end" color="medium" />
                </ion-item>
              </ion-col>
              <ion-col size="6">
                <ion-item button @click="abrirFecha('fin')">
                  <ion-label position="stacked">Fecha fin</ion-label>
                  <ion-input :value="formatDisplay(form.fecha_fin)" readonly placeholder="dd/mm/yyyy" />
                  <ion-icon :icon="calendarOutline" slot="end" color="medium" />
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- ══ 2. COSECHA (condicional) ══ -->
      <ion-card v-if="esCosecha">
        <ion-card-header>
          <ion-card-title class="card-title">
            <ion-icon :icon="archiveOutline" /> Datos de Cosecha
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>Editar merma (%)</ion-label>
            <ion-toggle v-model="editarMerma" />
          </ion-item>
          <ion-item v-if="editarMerma">
            <ion-label position="stacked">Merma (%)</ion-label>
            <ion-input v-model.number="form.pctj_merma" inputmode="decimal" @ionInput="onMermaChange" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Baldes</ion-label>
            <ion-input v-model.number="form.cant_baldes" inputmode="decimal" @ionInput="onBaldesChange" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Kg Fresco (bruto)</ion-label>
            <ion-input v-model.number="form.cant_kg_fresco" inputmode="decimal" @ionInput="onKgFrescoChange" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Kg Seco (calculado)</ion-label>
            <ion-input :value="form.cant_kg_secado" readonly />
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- ══ 3. MANO DE OBRA ══ -->
      <ion-card>
        <ion-card-header>
          <div class="card-title-row">
            <ion-card-title class="card-title"><ion-icon :icon="peopleOutline" /> Mano de Obra</ion-card-title>
            <ion-badge v-if="totalManoObra > 0" color="primary" class="cost-badge">S/ {{ totalManoObra.toFixed(2) }}</ion-badge>
          </div>
        </ion-card-header>
        <ion-card-content style="padding:0">
          <ion-list lines="full" style="margin:0">
            <ion-item v-for="(row, i) in manoObra" :key="i">
              <ion-label>
                <h3>{{ row.tipo_trabajo || 'Sin actividad' }}</h3>
                <p>{{ row.num_obreros }} obr. × {{ row.dias }} días × S/{{ row.costo_por_obrero }}</p>
              </ion-label>
              <div slot="end" class="item-end-group">
                <span class="item-cost">S/ {{ (+row.subtotal).toFixed(2) }}</span>
                <ion-button fill="clear" color="danger" @click="manoObra.splice(i,1); calcTotales()">
                  <ion-icon slot="icon-only" :icon="trashOutline" />
                </ion-button>
              </div>
            </ion-item>
          </ion-list>
          <div class="card-action">
            <ion-button expand="block" fill="solid" color="primary" @click="abrirMO">
              <ion-icon slot="start" :icon="addOutline" /> Agregar mano de obra
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- ══ 4. INSUMOS ══ -->
      <ion-card>
        <ion-card-header>
          <div class="card-title-row">
            <ion-card-title class="card-title"><ion-icon :icon="flaskOutline" /> Insumos y Materiales</ion-card-title>
            <ion-badge v-if="totalInsumos > 0" color="tertiary" class="cost-badge">S/ {{ totalInsumos.toFixed(2) }}</ion-badge>
          </div>
        </ion-card-header>
        <ion-card-content style="padding:0">
          <ion-list lines="full" style="margin:0">
            <ion-item v-for="(row, i) in insumosUsados" :key="i">
              <ion-label>
                <h3>{{ row.nombre }}</h3>
                <p>{{ row.tipo_insumo }} · {{ row.cantidad }} × S/{{ row.costo_unitario }}</p>
              </ion-label>
              <div slot="end" class="item-end-group">
                <span class="item-cost">S/ {{ (+row.subtotal).toFixed(2) }}</span>
                <ion-button fill="clear" color="danger" @click="insumosUsados.splice(i,1); calcTotales()">
                  <ion-icon slot="icon-only" :icon="trashOutline" />
                </ion-button>
              </div>
            </ion-item>
          </ion-list>
          <div class="card-action">
            <ion-button expand="block" fill="solid" color="tertiary" @click="abrirInsumo">
              <ion-icon slot="start" :icon="addOutline" /> Agregar insumo
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- ══ 5. HERRAMIENTAS ══ -->
      <ion-card>
        <ion-card-header>
          <div class="card-title-row">
            <ion-card-title class="card-title"><ion-icon :icon="hammerOutline" /> Herramientas y Maquinaria</ion-card-title>
            <ion-badge v-if="totalHerramientas > 0" color="warning" class="cost-badge">S/ {{ totalHerramientas.toFixed(2) }}</ion-badge>
          </div>
        </ion-card-header>
        <ion-card-content style="padding:0">
          <ion-list lines="full" style="margin:0">
            <ion-item v-for="(row, i) in herramientasUsadas" :key="i">
              <ion-label>
                <h3>{{ row.nombre }}</h3>
                <p>{{ row.modalidad }} · {{ row.cantidad }} ud. × S/{{ row.costo_unitario }}</p>
              </ion-label>
              <div slot="end" class="item-end-group">
                <span class="item-cost">S/ {{ (+row.subtotal).toFixed(2) }}</span>
                <ion-button fill="clear" color="danger" @click="herramientasUsadas.splice(i,1); calcTotales()">
                  <ion-icon slot="icon-only" :icon="trashOutline" />
                </ion-button>
              </div>
            </ion-item>
          </ion-list>
          <div class="card-action">
            <ion-button expand="block" fill="solid" color="warning" @click="abrirHerr">
              <ion-icon slot="start" :icon="addOutline" /> Agregar herramienta
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- ══ 6. OBSERVACIONES ══ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title class="card-title"><ion-icon :icon="chatboxOutline" /> Observaciones</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-textarea v-model="form.observaciones" :rows="3" placeholder="Notas adicionales..." />
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- ══ 7. TOTALES ══ -->
      <ion-card color="success" class="totales-card">
        <ion-card-content>
          <div class="total-row"><span>Mano de obra</span><span>S/ {{ totalManoObra.toFixed(2) }}</span></div>
          <div class="total-row"><span>Insumos</span><span>S/ {{ totalInsumos.toFixed(2) }}</span></div>
          <div class="total-row"><span>Herramientas</span><span>S/ {{ totalHerramientas.toFixed(2) }}</span></div>
          <div class="total-row total-row--final">
            <span>Costo total</span>
            <span>S/ {{ totalGeneral.toFixed(2) }}</span>
          </div>
        </ion-card-content>
      </ion-card>

    </ion-content>

    <!-- ══ MODAL MANO DE OBRA ══ -->
    <ion-modal :is-open="showManoObra" @didDismiss="showManoObra=false" :breakpoints="[0,0.85]" :initial-breakpoint="0.85">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Mano de Obra</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showManoObra=false"><ion-icon :icon="closeOutline" /></ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list inset>
          <ion-item>
            <ion-label position="stacked">Actividad / tipo de trabajo</ion-label>
            <ion-input v-model="newMO.tipo_trabajo" placeholder="Ej: deshierbo, siembra..." clearInput />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Nº de obreros</ion-label>
            <ion-input v-model.number="newMO.num_obreros" inputmode="numeric" placeholder="1" @ionInput="calcMO" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Días / jornadas</ion-label>
            <ion-input v-model.number="newMO.dias" inputmode="decimal" placeholder="1" @ionInput="calcMO" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Costo por día (S/.)</ion-label>
            <ion-input v-model.number="newMO.costo_por_obrero" inputmode="decimal" placeholder="0.00" @ionInput="calcMO" />
          </ion-item>
        </ion-list>
        <div class="modal-subtotal">
          <span>Subtotal</span>
          <strong>S/ {{ newMO.subtotal.toFixed(2) }}</strong>
        </div>
        <ion-button expand="block" color="primary" @click="confirmarMO">
          <ion-icon slot="start" :icon="checkmarkOutline" /> Agregar
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- ══ MODAL INSUMOS ══ -->
    <ion-modal :is-open="showInsumo" @didDismiss="showInsumo=false" :breakpoints="[0,0.92]" :initial-breakpoint="0.92">
      <ion-header>
        <ion-toolbar color="tertiary">
          <ion-title>Insumo / Material</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showInsumo=false"><ion-icon :icon="closeOutline" /></ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list inset>
          <ion-item>
            <ion-label position="stacked">Tipo de insumo</ion-label>
            <ion-select v-model="newInsumo.tipo_insumo" interface="action-sheet">
              <ion-select-option v-for="t in TIPOS_INSUMO" :key="t.v" :value="t.v">{{ t.l }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Nombre del insumo</ion-label>
            <ion-input v-model="newInsumo.nombre" placeholder="Ej: Urea, Funguran..." clearInput />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Cantidad</ion-label>
            <ion-input v-model.number="newInsumo.cantidad" inputmode="decimal" placeholder="1" @ionInput="calcInsumo" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Costo unitario (S/.)</ion-label>
            <ion-input v-model.number="newInsumo.costo_unitario" inputmode="decimal" placeholder="0.00" @ionInput="calcInsumo" />
          </ion-item>
        </ion-list>
        <div class="modal-subtotal">
          <span>Subtotal</span>
          <strong>S/ {{ newInsumo.subtotal.toFixed(2) }}</strong>
        </div>
        <ion-button expand="block" color="tertiary" @click="confirmarInsumo">
          <ion-icon slot="start" :icon="checkmarkOutline" /> Agregar
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- ══ MODAL HERRAMIENTAS ══ -->
    <ion-modal :is-open="showHerramienta" @didDismiss="showHerramienta=false" :breakpoints="[0,0.85]" :initial-breakpoint="0.85">
      <ion-header>
        <ion-toolbar color="warning">
          <ion-title>Herramienta / Maquinaria</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showHerramienta=false"><ion-icon :icon="closeOutline" /></ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list inset>
          <ion-item>
            <ion-label position="stacked">Nombre</ion-label>
            <ion-input v-model="newHerr.nombre" placeholder="Ej: motocultor, mochila..." clearInput />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Modalidad</ion-label>
            <ion-select v-model="newHerr.modalidad" interface="action-sheet">
              <ion-select-option value="alquilado">Alquilado</ion-select-option>
              <ion-select-option value="comprado">Comprado</ion-select-option>
              <ion-select-option value="propio">Propio</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Cantidad / días de uso</ion-label>
            <ion-input v-model.number="newHerr.cantidad" inputmode="decimal" placeholder="1" @ionInput="calcHerr" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Costo unitario (S/.)</ion-label>
            <ion-input v-model.number="newHerr.costo_unitario" inputmode="decimal" placeholder="0.00" @ionInput="calcHerr" />
          </ion-item>
        </ion-list>
        <div class="modal-subtotal">
          <span>Subtotal</span>
          <strong>S/ {{ newHerr.subtotal.toFixed(2) }}</strong>
        </div>
        <ion-button expand="block" color="warning" @click="confirmarHerr">
          <ion-icon slot="start" :icon="checkmarkOutline" /> Agregar
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- ══ MODAL FECHA ══ -->
    <ion-modal :is-open="fechaOpen" @didDismiss="fechaOpen = false" :breakpoints="[0, 0.6]" :initial-breakpoint="0.6">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonButton, IonButtons, IonIcon, IonSpinner,
  IonToggle, IonModal, IonDatetime, IonList, IonBadge, IonTitle, IonHeader, IonToolbar,
  toastController,
} from '@ionic/vue'
import {
  checkmarkOutline, addOutline, trashOutline, closeOutline,
  newspaperOutline, archiveOutline, peopleOutline,
  flaskOutline, hammerOutline, chatboxOutline, calendarOutline,
} from 'ionicons/icons'
import { useTareas } from '../../composables/useTareas'
import { useParcelas } from '../../composables/useParcelas'
import { useCosechas } from '../../composables/useCosechas'
import { useCostoObreros } from '../../composables/useCostoObreros'
import { useCostoHerramientas } from '../../composables/useCostoHerramientas'
import { useCostoInsumos } from '../../composables/useCostoInsumos'

const TIPOS_TAREA = ['Poda de formación','Poda sanitaria','Deshierbo/limpieza','Fertilización','Cosecha','Fermentación y secado','Injertación','Control fitosanitario','Otra tarea']
const TIPOS_INSUMO = [
  { v: 'insecticida', l: 'Insecticida' },
  { v: 'fungicida',   l: 'Fungicida' },
  { v: 'foliar',      l: 'Foliar' },
  { v: 'abono',       l: 'Abono / fertilizante' },
  { v: 'herbicida',   l: 'Herbicida' },
  { v: 'otro',        l: 'Otro' },
]
const KG_POR_BALDE = 17.5

const route  = useRoute()
const router = useRouter()
const { getOne, crear, editar } = useTareas()
const { getAll: getParcelas } = useParcelas()
const { crear: crearCosecha, editar: editarCosecha, porTarea: cosechasPorTarea } = useCosechas()
const { porTarea: mosPorTarea, crear: crearMO, eliminarPorTarea: eliminarMOs } = useCostoObreros()
const { porTarea: herrPorTarea, crear: crearHerr, eliminarPorTarea: eliminarHerrs } = useCostoHerramientas()
const { porTarea: insPorTarea, crear: crearIns, eliminarPorTarea: eliminarIns } = useCostoInsumos()

const saving   = ref(false)
const parcelas = ref([])
const isEdit   = computed(() => !!route.params.id)

const form = ref({
  tipo_tarea: '', descripcion: '',
  parcela_id: '', estado: 'programada',
  fecha_programada: '', fecha_fin: '', observaciones: '',
  pctj_merma: 60, cant_baldes: null, cant_kg_fresco: null, cant_kg_secado: null,
})

const manoObra           = ref([])
const insumosUsados      = ref([])
const herramientasUsadas = ref([])

const totalManoObra     = ref(0)
const totalInsumos      = ref(0)
const totalHerramientas = ref(0)
const totalGeneral      = computed(() => totalManoObra.value + totalInsumos.value + totalHerramientas.value)

const showManoObra    = ref(false)
const showInsumo      = ref(false)
const showHerramienta = ref(false)
const editarMerma     = ref(false)

const fechaOpen = ref(false)
const tipoFecha = ref('programada')
const tempFecha = ref('')

function abrirFecha(tipo) {
  tipoFecha.value = tipo
  const val = tipo === 'programada' ? form.value.fecha_programada : form.value.fecha_fin
  tempFecha.value = val ? val + 'T00:00:00' : new Date().toISOString().substring(0, 10) + 'T00:00:00'
  fechaOpen.value = true
}

function confirmarFecha(ev) {
  const val = ev?.detail?.value || tempFecha.value
  if (!val) return
  const iso = (typeof val === 'string' ? val : val.toString()).substring(0, 10)
  if (tipoFecha.value === 'programada') {
    form.value.fecha_programada = iso
  } else {
    form.value.fecha_fin = iso
  }
  fechaOpen.value = false
}

function formatDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.substring(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const newMO     = ref({ tipo_trabajo: '', num_obreros: 1, dias: 1, costo_por_obrero: 0, subtotal: 0 })
const newInsumo = ref({ tipo_insumo: 'otro', nombre: '', cantidad: 1, costo_unitario: 0, subtotal: 0 })
const newHerr   = ref({ nombre: '', modalidad: 'alquilado', cantidad: 1, costo_unitario: 0, subtotal: 0 })

let cosechaExistenteId = null

const esCosecha = computed(() => form.value.tipo_tarea?.toLowerCase().includes('cosecha'))

const isFormValid = computed(() =>
  !!form.value.tipo_tarea && !!form.value.parcela_id && !!form.value.fecha_programada
)

async function loadData() {
  parcelas.value = await getParcelas()

  if (isEdit.value) {
    const tarea = await getOne(route.params.id)
    if (!tarea) return
    form.value = {
      tipo_tarea:       tarea.tipo_tarea || '',
      descripcion:      tarea.descripcion || '',
      parcela_id:       tarea.parcela_id || '',
      estado:           tarea.estado || 'programada',
      fecha_programada: tarea.fecha_programada ? tarea.fecha_programada.substring(0, 10) : (tarea.fecha_inicio ? tarea.fecha_inicio.substring(0, 10) : ''),
      fecha_fin:        tarea.fecha_fin ? tarea.fecha_fin.substring(0, 10) : '',
      observaciones:    tarea.observaciones || '',
      pctj_merma:       tarea.pctj_merma   ?? 60,
      cant_baldes:      tarea.cant_baldes   ?? null,
      cant_kg_fresco:   tarea.cant_kg_fresco  ?? null,
      cant_kg_secado:   tarea.cant_kg_secado  ?? null,
    }

    manoObra.value           = await mosPorTarea(tarea.id)
    insumosUsados.value      = await insPorTarea(tarea.id)
    herramientasUsadas.value = await herrPorTarea(tarea.id)
    calcTotales()

    const cosechasVinculadas = await cosechasPorTarea(tarea.id)
    if (cosechasVinculadas.length) cosechaExistenteId = cosechasVinculadas[0].id
  }
}

// ── Cosecha ──────────────────────────────────────────────────────────────────

let _lock = false
function onBaldesChange() {
  if (_lock) return; _lock = true
  const b = +form.value.cant_baldes || 0
  const m = +form.value.pctj_merma  || 0
  const f = round4(b * KG_POR_BALDE)
  form.value.cant_kg_fresco = f
  form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function onKgFrescoChange() {
  if (_lock) return; _lock = true
  const f = +form.value.cant_kg_fresco || 0
  const m = +form.value.pctj_merma     || 0
  form.value.cant_baldes    = round4(f / KG_POR_BALDE)
  form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function onMermaChange() {
  if (_lock) return; _lock = true
  const f = +form.value.cant_kg_fresco || 0
  const m = +form.value.pctj_merma     || 0
  form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function round4(v) { return Math.round(v * 10000) / 10000 }

// ── Mano de obra ─────────────────────────────────────────────────────────────

function abrirMO() { newMO.value = { tipo_trabajo: '', num_obreros: 1, dias: 1, costo_por_obrero: 0, subtotal: 0 }; showManoObra.value = true }
function calcMO()  { const r = newMO.value; r.subtotal = (+r.num_obreros||0) * (+r.dias||0) * (+r.costo_por_obrero||0) }
function confirmarMO() { calcMO(); manoObra.value.push({...newMO.value}); showManoObra.value = false; calcTotales() }

// ── Insumos ──────────────────────────────────────────────────────────────────

function abrirInsumo()     { newInsumo.value = { tipo_insumo: 'otro', nombre: '', cantidad: 1, costo_unitario: 0, subtotal: 0 }; showInsumo.value = true }
function calcInsumo()      { const r = newInsumo.value; r.subtotal = (+r.cantidad||0) * (+r.costo_unitario||0) }
function confirmarInsumo() { calcInsumo(); insumosUsados.value.push({...newInsumo.value}); showInsumo.value = false; calcTotales() }

// ── Herramientas ─────────────────────────────────────────────────────────────

function abrirHerr()    { newHerr.value = { nombre: '', modalidad: 'alquilado', cantidad: 1, costo_unitario: 0, subtotal: 0 }; showHerramienta.value = true }
function calcHerr()     { const r = newHerr.value; r.subtotal = (+r.cantidad||0) * (+r.costo_unitario||0) }
function confirmarHerr(){ calcHerr(); herramientasUsadas.value.push({...newHerr.value}); showHerramienta.value = false; calcTotales() }

// ── Totales ──────────────────────────────────────────────────────────────────

function calcTotales() {
  totalManoObra.value     = manoObra.value.reduce((s, r) => s + (+r.subtotal||0), 0)
  totalInsumos.value      = insumosUsados.value.reduce((s, r) => s + (+r.subtotal||0), 0)
  totalHerramientas.value = herramientasUsadas.value.reduce((s, r) => s + (+r.subtotal||0), 0)
}

// ── Guardar ──────────────────────────────────────────────────────────────────

async function guardar() {
  if (!isFormValid.value) return
  saving.value = true
  try {
    const data = {
      tipo_tarea:      form.value.tipo_tarea,
      descripcion:     form.value.descripcion,
      parcela_id:      form.value.parcela_id,
      estado:          form.value.estado,
      fecha_programada: form.value.fecha_programada,
      fecha_inicio:    form.value.fecha_programada,
      fecha_fin:       form.value.fecha_fin,
      observaciones:   form.value.observaciones,
      costo_total:     totalGeneral.value,
    }

    let tareaId = route.params.id
    if (isEdit.value) {
      await editar(tareaId, data)
    } else {
      const res = await crear(data)
      tareaId = res.id
    }

    // Guardar costos en tablas separadas (borrar y recrear en edición)
    if (isEdit.value) {
      await eliminarMOs(tareaId)
      await eliminarIns(tareaId)
      await eliminarHerrs(tareaId)
    }
    for (const r of manoObra.value) {
      await crearMO({ tarea_id: tareaId, tipo_trabajo: r.tipo_trabajo, num_obreros: +r.num_obreros, dias: +r.dias, costo_por_obrero: +r.costo_por_obrero, subtotal: +r.subtotal })
    }
    for (const r of insumosUsados.value) {
      await crearIns({ tarea_id: tareaId, tipo_insumo: r.tipo_insumo, nombre: r.nombre, cantidad: +r.cantidad, costo_unitario: +r.costo_unitario, subtotal: +r.subtotal })
    }
    for (const r of herramientasUsadas.value) {
      await crearHerr({ tarea_id: tareaId, nombre: r.nombre, modalidad: r.modalidad, cantidad: +r.cantidad, costo_unitario: +r.costo_unitario, subtotal: +r.subtotal })
    }

    // Si es cosecha → crear/actualizar registro en tabla cosechas
    if (esCosecha.value) {
      const cosechaData = {
        parcela_id:    form.value.parcela_id,
        tarea_id:      tareaId,
        fecha_cosecha: form.value.fecha_fin || form.value.fecha_programada,
        pctj_merma:    form.value.pctj_merma,
        cant_baldes:   form.value.cant_baldes,
        kg_bruto:      form.value.cant_kg_fresco,
        kg_seco:       form.value.cant_kg_secado,
      }
      if (cosechaExistenteId) {
        await editarCosecha(cosechaExistenteId, cosechaData)
      } else {
        await crearCosecha({
          ...cosechaData,
          kg_bruto_disponible: cosechaData.kg_bruto  || 0,
          kg_seco_disponible:  cosechaData.kg_seco   || 0,
          estado: 'COSECHADO',
        })
      }
    }

    const t = await toastController.create({ message: 'Tarea guardada', duration: 2000, color: 'success', position: 'top' })
    t.present()
    router.back()
  } catch (e) {
    const t = await toastController.create({ message: 'Error: ' + e.message, duration: 2500, color: 'danger', position: 'top' })
    t.present()
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.card-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.card-title ion-icon { font-size: 1.1rem; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; padding-right: 4px; }
.cost-badge { font-size: 0.8rem; padding: 4px 8px; border-radius: 20px; }

.item-end-group { display: flex; align-items: center; gap: 4px; }
.item-cost { font-weight: 700; font-size: 0.85rem; color: var(--ion-color-success); white-space: nowrap; }

.card-action { padding: 12px 16px 16px; }
.card-action ion-button { --border-radius: 10px; height: 46px; font-weight: 600; }

.modal-subtotal {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--ion-color-light);
  border-radius: 10px;
  padding: 14px 18px;
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--ion-color-medium);
}
.modal-subtotal strong { font-size: 1.2rem; font-weight: 800; color: var(--ion-color-success); }

.totales-card { margin-bottom: 24px; }
.total-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: rgba(255,255,255,0.85); font-size: 0.85rem; }
.total-row--final {
  border-top: 1px solid rgba(255,255,255,0.35);
  padding-top: 10px; margin-top: 4px; margin-bottom: 0;
  color: white; font-size: 1rem; font-weight: 700;
}
.total-row--final span:last-child { font-size: 1.3rem; font-weight: 800; }

@media (prefers-color-scheme: light) {
  .datetime-tema { --ion-color-primary: #174437; }
}
@media (prefers-color-scheme: dark) {
  .datetime-tema { --ion-color-primary: #54b69a; }
}
</style>
