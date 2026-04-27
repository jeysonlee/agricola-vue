<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-button @click="$emit('cancel')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button></ion-buttons>
        <ion-title>{{ isEdit ? 'Editar' : 'Registrar' }} Cosecha</ion-title>
        <ion-buttons slot="end"><ion-button @click="guardar" :disabled="saving"><ion-spinner v-if="saving" name="crescent" /><ion-icon v-else slot="icon-only" :icon="checkmarkOutline" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <ion-card>
        <ion-card-header>
          <ion-card-title class="card-title"><ion-icon :icon="archiveOutline" /> Datos de la Cosecha</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Parcela *</ion-label>
            <ion-select v-model="form.parcela_id" placeholder="Seleccionar parcela">
              <ion-select-option v-for="p in parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Fecha *</ion-label>
            <ion-input v-model="form.fecha_cosecha" type="date" required />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Baldes</ion-label>
            <ion-input v-model.number="form.cant_baldes" type="number" @ionInput="onBaldesChange" />
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title class="card-title"><ion-icon :icon="scaleOutline" /> Pesos</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">% Merma</ion-label>
            <ion-input v-model.number="form.pctj_merma" type="number" @ionInput="onMermaChange" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Kg Bruto (fresco)</ion-label>
            <ion-input v-model.number="form.kg_bruto" type="number" @ionInput="onKgBrutoChange" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Kg Seco (calculado)</ion-label>
            <ion-input :value="form.kg_seco" readonly />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Estado</ion-label>
            <ion-select v-model="form.estado">
              <ion-select-option value="COSECHADO">Cosechado</ion-select-option>
              <ion-select-option value="PARCIAL">Parcial</ion-select-option>
              <ion-select-option value="VENDIDO">Vendido</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonSpinner,
  toastController,
} from '@ionic/vue'
import { closeOutline, checkmarkOutline, archiveOutline, scaleOutline } from 'ionicons/icons'
import { useCosechas } from '../../composables/useCosechas'

const KG_POR_BALDE = 17.5

const props = defineProps({ cosecha: { type: Object, default: null }, parcelas: { type: Array, default: () => [] } })
const emit  = defineEmits(['saved', 'cancel'])
const { crear, editar } = useCosechas()

const saving = ref(false)
const isEdit = computed(() => !!props.cosecha)

const emptyForm = () => ({
  parcela_id:    '',
  fecha_cosecha: new Date().toISOString().substring(0, 10),
  pctj_merma:    60,
  cant_baldes:   null,
  kg_bruto:      null,
  kg_seco:       null,
  estado:        'COSECHADO',
})

const form = ref(emptyForm())

watch(() => props.cosecha, (val) => {
  if (val) {
    form.value = {
      parcela_id:    val.parcela_id    || '',
      fecha_cosecha: (val.fecha_cosecha || val.fecha || '').substring(0, 10),
      pctj_merma:    val.pctj_merma    ?? 60,
      cant_baldes:   val.cant_baldes   ?? null,
      kg_bruto:      val.kg_bruto      ?? val.cantidad ?? null,
      kg_seco:       val.kg_seco       ?? null,
      estado:        val.estado        || 'COSECHADO',
    }
  } else {
    form.value = emptyForm()
  }
}, { immediate: true })

let _lock = false
function round4(v) { return Math.round(v * 10000) / 10000 }

function onBaldesChange() {
  if (_lock) return; _lock = true
  const b = +form.value.cant_baldes || 0
  const m = +form.value.pctj_merma  || 0
  form.value.kg_bruto = round4(b * KG_POR_BALDE)
  form.value.kg_seco  = round4(form.value.kg_bruto * (1 - m / 100))
  _lock = false
}
function onKgBrutoChange() {
  if (_lock) return; _lock = true
  const f = +form.value.kg_bruto || 0
  const m = +form.value.pctj_merma || 0
  form.value.cant_baldes = round4(f / KG_POR_BALDE)
  form.value.kg_seco     = round4(f * (1 - m / 100))
  _lock = false
}
function onMermaChange() {
  if (_lock) return; _lock = true
  const f = +form.value.kg_bruto || 0
  const m = +form.value.pctj_merma || 0
  form.value.kg_seco = round4(f * (1 - m / 100))
  _lock = false
}

async function guardar() {
  if (!form.value.parcela_id || !form.value.fecha_cosecha) {
    const t = await toastController.create({ message: 'Parcela y fecha son requeridos', duration: 2000, color: 'warning', position: 'top' })
    return t.present()
  }
  saving.value = true
  try {
    const data = {
      ...form.value,
      // compatibilidad con campos anteriores de la tabla
      fecha:    form.value.fecha_cosecha,
      cantidad: form.value.kg_bruto,
      unidad:   'kg',
    }
    if (isEdit.value) await editar(props.cosecha.id, data)
    else await crear(data)
    emit('saved')
  } catch (e) {
    const t = await toastController.create({ message: 'Error: ' + e.message, duration: 2500, color: 'danger', position: 'top' })
    t.present()
  } finally { saving.value = false }
}
</script>

<style scoped>
.card-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.card-title ion-icon { font-size: 1.1rem; }
</style>
