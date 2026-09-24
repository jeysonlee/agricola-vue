<template>
  <ion-page>
    <AppHeader title="Tickets promocionales">
      <template #end>
        <ion-button @click="scrollToForm">
          <ion-icon slot="icon-only" :icon="addOutline" />
        </ion-button>
      </template>
    </AppHeader>

    <ion-content class="screen-content">
      <section ref="formSection" class="form-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Nueva emisión</p>
            <h2>Registrar compra</h2>
          </div>
          <ion-icon :icon="ticketOutline" class="heading-icon" />
        </div>

        <form @submit.prevent="submitForm">
          <div class="field-grid">
            <ion-input v-model.trim="form.telefono" label="Teléfono *" label-placement="stacked"
              placeholder="999 999 999" inputmode="tel" required />
            <ion-input v-model.trim="form.dni" label="DNI *" label-placement="stacked"
              placeholder="12345678" inputmode="numeric" maxlength="8" required />
          </div>
          <ion-input v-model.trim="form.nombre" label="Nombre completo *" label-placement="stacked"
            placeholder="Nombres y apellidos" required />
          <ion-input v-model.number="form.monto" label="Monto de compra (S/) *" label-placement="stacked"
            placeholder="0.00" type="number" min="0" step="0.01" inputmode="decimal" required />
          <ion-item lines="none" class="special-item">
            <ion-label>
              <strong>¿Compró productos especiales?</strong>
              <p>Recibe 3 tickets adicionales</p>
            </ion-label>
            <ion-toggle v-model="form.productoEspecial" />
          </ion-item>

          <div class="calculation" :class="{ warning: baseTickets === 0 }">
            <span>Tickets por compra</span>
            <strong>{{ totalTickets }}</strong>
            <small v-if="baseTickets === 0">Se requiere un mínimo de S/ 100</small>
            <small v-else>{{ baseTickets }} por monto + {{ form.productoEspecial ? 3 : 0 }} especiales</small>
          </div>
          <ion-button expand="block" type="submit" :disabled="!canSubmit">
            <ion-icon slot="start" :icon="ticketOutline" />
            Generar e imprimir tickets
          </ion-button>
        </form>
      </section>

      <section class="list-section">
        <div class="list-heading">
          <div>
            <p class="eyebrow">Historial</p>
            <h2>Tickets emitidos</h2>
          </div>
          <ion-badge color="primary">{{ tickets.length }}</ion-badge>
        </div>

        <div v-if="tickets.length" class="ticket-list">
          <article v-for="ticket in tickets" :key="ticket.id" class="ticket-row">
            <div class="ticket-number">{{ ticket.numero }}</div>
            <div class="ticket-info">
              <strong>{{ ticket.nombre }}</strong>
              <span>DNI {{ ticket.dni }} · S/ {{ ticket.monto.toFixed(2) }}</span>
              <small>{{ formatDate(ticket.createdAt) }} · Hash {{ ticket.hash }}</small>
            </div>
            <ion-button fill="clear" size="small" @click="printTicket(ticket)" aria-label="Imprimir ticket">
              <ion-icon slot="icon-only" :icon="printOutline" />
            </ion-button>
          </article>
        </div>
        <div v-else class="empty-state">
          <ion-icon :icon="ticketOutline" />
          <p>Aún no hay tickets emitidos.</p>
        </div>
      </section>
    </ion-content>

    <div v-if="printingTickets.length" class="print-tickets">
      <div v-for="ticket in printingTickets" :key="ticket.id" class="print-ticket">
        <h1>AGRICOLA</h1>
        <h2>TICKET PROMOCIONAL</h2>
        <div class="print-rule" />
        <p class="print-number">N.° {{ ticket.numero }}</p>
        <p><strong>Cliente:</strong> {{ ticket.nombre }}</p>
        <p><strong>DNI:</strong> {{ ticket.dni }}</p>
        <p><strong>Teléfono:</strong> {{ ticket.telefono }}</p>
        <p><strong>Compra:</strong> S/ {{ ticket.monto.toFixed(2) }}</p>
        <p><strong>Producto especial:</strong> {{ ticket.productoEspecial ? 'Sí' : 'No' }}</p>
        <div class="print-rule" />
        <p class="print-hash">HASH: {{ ticket.hash }}</p>
        <p>{{ formatDate(ticket.createdAt) }}</p>
        <p>Conserve este ticket</p>
      </div>
    </div>
  </ion-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { IonPage, IonContent, IonButton, IonIcon, IonInput, IonItem, IonLabel, IonToggle, IonBadge, toastController } from '@ionic/vue'
import { addOutline, printOutline, ticketOutline } from 'ionicons/icons'
import AppHeader from '../../components/AppHeader.vue'

const STORAGE_KEY = 'agricola_promotional_tickets'
const formSection = ref(null)
const tickets = ref([])
const printingTickets = ref([])
const form = ref({ telefono: '', dni: '', nombre: '', monto: null, productoEspecial: false })

const baseTickets = computed(() => Math.floor(Math.max(0, Number(form.value.monto) || 0) / 100))
const totalTickets = computed(() => baseTickets.value + (form.value.productoEspecial ? 3 : 0))
const canSubmit = computed(() =>
  Boolean(form.value.telefono && form.value.dni && form.value.nombre && Number(form.value.monto) >= 100)
)

function readTickets() {
  try {
    tickets.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch (error) {
    console.error('[Tickets] No se pudo leer el historial:', error)
    tickets.value = []
  }
}

function makeHash() {
  const source = `${Date.now()}-${Math.random()}-${form.value.dni}`
  return Array.from(source).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0)
    .toString(16).replace('-', '').toUpperCase().padStart(8, '0')
}

async function submitForm() {
  if (!canSubmit.value) return
  const lastNumber = tickets.value.reduce((max, ticket) => Math.max(max, Number(ticket.numero) || 99), 99)
  const createdAt = new Date().toISOString()
  const generated = Array.from({ length: totalTickets.value }, (_, index) => ({
    id: `${createdAt}-${index}`,
    numero: lastNumber + index + 1,
    hash: makeHash(),
    ...form.value,
    monto: Number(form.value.monto),
    createdAt,
  }))
  tickets.value = [...generated, ...tickets.value]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.value))
  form.value = { telefono: '', dni: '', nombre: '', monto: null, productoEspecial: false }
  await showToast(`${generated.length} ticket${generated.length === 1 ? '' : 's'} generado${generated.length === 1 ? '' : 's'}`, 'success')
  printTicket(generated)
}

async function printTicket(ticketOrTickets) {
  printingTickets.value = Array.isArray(ticketOrTickets) ? ticketOrTickets : [ticketOrTickets]
  await nextTick()
  window.print()
  printingTickets.value = []
}

function formatDate(value) {
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function scrollToForm() {
  formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function showToast(message, color) {
  const toast = await toastController.create({ message, duration: 2200, color, position: 'top' })
  await toast.present()
}

onMounted(readTickets)
</script>

<style scoped>
.screen-content { --padding-bottom: 28px; }
.form-card, .list-section { margin: 16px 12px 0; padding: 18px; border-radius: 18px; background: var(--ion-item-background, #fff); box-shadow: 0 2px 10px rgba(0,0,0,.06); }
.section-heading, .list-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.eyebrow { margin: 0 0 3px; color: var(--ion-color-primary); font-size: 11px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; }
h2 { margin: 0; color: var(--ion-color-dark); font-size: 20px; font-weight: 800; }
.heading-icon { padding: 11px; border-radius: 12px; color: #fff; background: var(--ion-color-primary); font-size: 23px; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
ion-input { --padding-start: 0; --padding-end: 0; margin-bottom: 12px; }
.special-item { --padding-start: 0; --inner-padding-end: 0; margin: 4px 0 12px; }
.special-item ion-label { white-space: normal; }
.special-item p { margin: 3px 0 0; color: var(--ion-color-medium); font-size: 12px; }
.calculation { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; margin: 4px 0 16px; padding: 12px; border-radius: 12px; color: var(--ion-color-primary); background: rgba(46,139,87,.1); }
.calculation strong { font-size: 24px; text-align: right; }
.calculation small { grid-column: 1 / -1; color: var(--ion-color-medium-shade); }
.calculation.warning { color: var(--ion-color-warning-shade); background: rgba(245,166,35,.12); }
.list-section { margin-bottom: 20px; }
.ticket-list { display: flex; flex-direction: column; gap: 8px; }
.ticket-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,.08); }
.ticket-row:last-child { border-bottom: 0; }
.ticket-number { display: grid; width: 42px; height: 42px; flex-shrink: 0; place-items: center; border-radius: 10px; color: #fff; background: var(--ion-color-primary); font-weight: 800; }
.ticket-info { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.ticket-info strong { overflow: hidden; color: var(--ion-color-dark); text-overflow: ellipsis; white-space: nowrap; }
.ticket-info span, .ticket-info small { color: var(--ion-color-medium-shade); font-size: 12px; }
.empty-state { padding: 28px; color: var(--ion-color-medium); text-align: center; }
.empty-state ion-icon { font-size: 42px; opacity: .45; }
.empty-state p { margin-bottom: 0; }
.print-tickets { display: none; }

@media print {
  :global(body *) { visibility: hidden !important; }
  :global(.print-tickets), :global(.print-ticket), :global(.print-ticket *) { visibility: visible !important; }
  :global(.print-tickets) { display: block !important; position: absolute; top: 0; left: 0; }
  :global(.print-ticket) { width: 80mm; min-height: 45mm; padding: 5mm; box-sizing: border-box; color: #000; background: #fff; font-family: monospace; font-size: 12px; text-align: center; page-break-after: always; }
  .print-ticket h1 { margin: 0; font-size: 20px; }
  .print-ticket h2 { margin: 4px 0; color: #000; font-size: 13px; }
  .print-ticket p { margin: 5px 0; text-align: left; }
  .print-ticket .print-number, .print-ticket .print-hash, .print-ticket > p:last-child { text-align: center; }
  .print-ticket .print-number { font-size: 24px; font-weight: 800; }
  .print-rule { border-top: 1px dashed #000; margin: 8px 0; }
  @page { size: 80mm auto; margin: 0; }
}
</style>
