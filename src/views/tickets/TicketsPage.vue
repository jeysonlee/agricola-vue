<template>
  <div class="tickets-page">
    <div class="tickets-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Promociones</p>
          <h1>Tickets promocionales</h1>
        </div>

        <div class="topbar-actions">
          <button type="button" class="action-button pdf" :disabled="!selectedSale || isExporting || isDeleting || isSaving" @click="selectedSale && downloadSalePdf(selectedSale)">
            <span v-if="isExporting" class="mini-spinner" aria-hidden="true"></span>
            {{ isExporting ? 'PDF...' : 'PDF' }}
          </button>
          <button type="button" class="action-button edit" :disabled="!selectedSale || isExporting || isDeleting || isSaving" @click="selectedSale && openForm(selectedSale)">Editar</button>
          <button type="button" class="action-button danger" :disabled="!selectedSale || isExporting || isDeleting || isSaving" @click="selectedSale && confirmDelete(selectedSale)">
            <span v-if="isDeleting" class="mini-spinner danger" aria-hidden="true"></span>
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
          <button class="primary-button" type="button" :disabled="isSaving || isDeleting || isExporting || isLoadingSales" @click="openForm(null)">
            <span v-if="isSaving" class="mini-spinner" aria-hidden="true"></span>
            {{ isSaving ? 'Guardando...' : '+ Nuevo' }}
          </button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="stat-card">
          <span>Total</span>
          <strong>{{ sales.length }}</strong>
          <small>Registros</small>
        </article>
        <article class="stat-card accent">
          <span>Tickets</span>
          <strong>{{ totalIssued }}</strong>
          <small>Emitidos</small>
        </article>
      </section>

      <section class="index-panel">
        <div class="section-head">
          <h2>Listado</h2>
          <span class="records-badge">{{ filteredSales.length }}</span>
        </div>

        <div class="toolbar-row">
          <input v-model="searchText" class="search-input" type="search" placeholder="Buscar por nombre, DNI o teléfono..." />
        </div>

        <div v-if="loading" class="empty-state small">
          <p>Cargando tickets...</p>
        </div>

        <div v-else-if="filteredSales.length" class="table-wrapper">
          <table class="tickets-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Monto</th>
                <th>Tickets</th>
                <th>Rango</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sale in filteredSales"
                :key="sale.id"
                :class="{ selected: selectedSaleId === sale.id }"
                @click="selectSale(sale)"
              >
                <td>{{ sale.nombre }}</td>
                <td>{{ sale.dni }}</td>
                <td>{{ sale.telefono }}</td>
                <td>S/ {{ Number(sale.monto).toFixed(2) }}</td>
                <td>{{ sale.tickets_generados }}</td>
                <td>{{ sale.ticket_inicio }} - {{ sale.ticket_fin }}</td>
                <td>{{ formatDate(sale.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <p>Aún no hay tickets registrados.</p>
        </div>
      </section>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <TicketForm :sale="selectedSale" :saving="saving" @submit="handleSubmit" @cancel="closeForm" />
    </div>

    <div v-if="printingTickets.length" class="print-tickets">
      <div v-for="ticket in printingTickets" :key="ticket.id" class="print-ticket">
        <div class="print-header">
          <img src="/graniti_logo.jpeg" alt="Graniti" class="print-logo" />
          <div class="campaign-head">
            <span class="campaign-kicker">Campaña de promoción</span>
            <strong>SIEMBRA Y GANA</strong>
          </div>
        </div>

        <div class="print-rule" />
        <p class="print-number">N.° {{ ticket.numero }}</p>
        <p><strong>Cliente:</strong> {{ ticket.nombre }}</p>
        <p><strong>DNI:</strong> {{ ticket.dni }}</p>
        <p><strong>Teléfono:</strong> {{ ticket.telefono }}</p>
        <p><strong>Compra:</strong> S/ {{ Number(ticket.monto).toFixed(2) }}</p>
        <p><strong>Producto especial:</strong> {{ ticket.productoEspecial ? 'Sí' : 'No' }}</p>
        <div class="print-rule" />
        <p class="print-hash">HASH: {{ ticket.hash }}</p>
        <p>{{ formatDate(ticket.createdAt) }}</p>
        <p>Conserve este ticket</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import './tickets-theme.css'
import { supabase } from '../../config/supabase'
import { exportTicketsToPdf as exportTicketPdfDocument } from '../../utils/ticketPdf'
import TicketForm from './TicketForm.vue'

const SALES_TABLE = 'promotional_ticket_sales'
const TICKETS_TABLE = 'promotional_tickets'
const sales = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const exporting = ref(false)
const loadingSales = ref(false)
const showForm = ref(false)
const selectedSale = ref(null)
const selectedSaleId = ref(null)
const searchText = ref('')
const printingTickets = ref([])

const isSaving = computed(() => saving.value)
const isDeleting = computed(() => deleting.value)
const isExporting = computed(() => exporting.value)
const isLoadingSales = computed(() => loadingSales.value)

const filteredSales = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query) return sales.value

  return sales.value.filter((sale) =>
    [sale.nombre, sale.dni, sale.telefono].some((value) =>
      String(value || '').toLowerCase().includes(query),
    ),
  )
})

const totalIssued = computed(() => sales.value.reduce((sum, sale) => sum + Number(sale.tickets_generados || 0), 0))

function getTotalTicketsForPayload(payload) {
  const base = Math.max(0, Math.floor(Number(payload.monto || 0) / 100))
  return base + (payload.productoEspecial ? 3 : 0)
}

function getTicketNumber(existingNumbers = []) {
  const used = new Set((existingNumbers || []).map((value) => String(value)))

  let candidate = ''
  do {
    candidate = String(Math.floor(100000 + Math.random() * 900000))
  } while (used.has(candidate))

  return candidate
}

function buildTicketRowsForSale(saleId, payload, existingNumbers = []) {
  const ticketCount = getTotalTicketsForPayload(payload)
  const rows = []
  const usedNumbers = new Set((existingNumbers || []).map((value) => String(value)))

  for (let index = 0; index < ticketCount; index += 1) {
    const ticketNumber = getTicketNumber(Array.from(usedNumbers))
    usedNumbers.add(ticketNumber)

    rows.push({
      id: makeId(),
      sale_id: saleId,
      numero: ticketNumber,
      hash_code: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.slice(0, 12).toUpperCase(),
      cliente_nombre: payload.nombre,
      dni: payload.dni,
      telefono: payload.telefono,
      monto_compra: Number(payload.monto),
      producto_especial: !!payload.productoEspecial,
      created_at: new Date().toISOString(),
    })
  }

  return rows
}

function normalizeSale(row) {
  return {
    id: row.id,
    nombre: row.cliente_nombre,
    dni: row.dni,
    telefono: row.telefono,
    monto: Number(row.monto_compra || 0),
    productoEspecial: !!row.tiene_producto_especial,
    tickets_base: Number(row.tickets_base || 0),
    tickets_adicionales: Number(row.tickets_adicionales || 0),
    tickets_generados: Number(row.tickets_generados || 0),
    ticket_inicio: Number(row.ticket_inicio || 0),
    ticket_fin: Number(row.ticket_fin || 0),
    createdAt: row.created_at,
  }
}

function selectSale(sale) {
  selectedSaleId.value = sale?.id ?? null
  selectedSale.value = sale || null
}

function openForm(sale) {
  const rowSale = sale || selectedSale.value
  selectedSale.value = rowSale
  selectedSaleId.value = rowSale?.id ?? null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  selectedSale.value = null
  selectedSaleId.value = null
}

function makeHash() {
  const source = `${Date.now()}-${Math.random()}-${selectedSale.value?.dni || 'ticket'}`
  return Array.from(source).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0)
    .toString(16)
    .replace('-', '')
    .toUpperCase()
    .padStart(8, '0')
}

function getSaleRangeFromTickets(ticketRows = []) {
  const numbers = (ticketRows || []).map((ticket) => Number(ticket.numero || 0)).filter((value) => Number.isFinite(value) && value > 0)
  if (!numbers.length) return { ticket_inicio: 0, ticket_fin: 0 }

  return {
    ticket_inicio: Math.min(...numbers),
    ticket_fin: Math.max(...numbers),
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function loadSales() {
  loadingSales.value = true
  loading.value = true
  try {
    const { data, error } = await supabase
      .from(SALES_TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    sales.value = (data || []).map(normalizeSale)
  } catch (error) {
    console.error('[Tickets] Error al cargar ventas:', error)
    sales.value = []
  } finally {
    loadingSales.value = false
    loading.value = false
  }
}

async function handleSubmit(payload) {
  saving.value = true
  try {
    const dni = payload.dni.trim()
    const monto = Number(payload.monto)
    const generatedCount = getTotalTicketsForPayload(payload)

    if (payload.id) {
      const saleUpdate = {
        cliente_nombre: payload.nombre,
        dni,
        telefono: payload.telefono,
        monto_compra: monto,
        tiene_producto_especial: !!payload.productoEspecial,
        tickets_base: Math.max(0, Math.floor(monto / 100)),
        tickets_adicionales: payload.productoEspecial ? 3 : 0,
        tickets_generados: generatedCount,
      }

      const { error: saleError } = await supabase
        .from(SALES_TABLE)
        .update(saleUpdate)
        .eq('id', payload.id)

      if (saleError) throw saleError

      const { data: currentTickets, error: currentTicketsError } = await supabase
        .from(TICKETS_TABLE)
        .select('id, numero, hash_code, cliente_nombre, dni, telefono, monto_compra, producto_especial, created_at')
        .eq('sale_id', payload.id)

      if (currentTicketsError) throw currentTicketsError

      const ticketRows = buildTicketRowsForSale(payload.id, payload, (currentTickets || []).map((ticket) => ticket.numero))
      const { error: deleteError } = await supabase.from(TICKETS_TABLE).delete().eq('sale_id', payload.id)
      if (deleteError) throw deleteError

      if (ticketRows.length) {
        const { error: ticketInsertError } = await supabase.from(TICKETS_TABLE).insert(ticketRows)
        if (ticketInsertError) throw ticketInsertError
      }

      const saleRange = getSaleRangeFromTickets(ticketRows)
      const { error: rangeError } = await supabase
        .from(SALES_TABLE)
        .update({
          ...saleUpdate,
          ticket_inicio: saleRange.ticket_inicio,
          ticket_fin: saleRange.ticket_fin,
        })
        .eq('id', payload.id)

      if (rangeError) throw rangeError

      const saleIndex = sales.value.findIndex((item) => item.id === payload.id)
      if (saleIndex !== -1) {
        sales.value[saleIndex] = {
          ...sales.value[saleIndex],
          nombre: payload.nombre,
          dni,
          telefono: payload.telefono,
          monto,
          productoEspecial: !!payload.productoEspecial,
          tickets_base: saleUpdate.tickets_base,
          tickets_adicionales: saleUpdate.tickets_adicionales,
          tickets_generados: generatedCount,
          ticket_inicio: saleRange.ticket_inicio,
          ticket_fin: saleRange.ticket_fin,
        }
      }

      closeForm()
      return
    }

    const base = Math.max(0, Math.floor(monto / 100))
    const salePayload = {
      id: makeId(),
      cliente_nombre: payload.nombre,
      dni,
      telefono: payload.telefono,
      monto_compra: monto,
      tiene_producto_especial: !!payload.productoEspecial,
      tickets_base: base,
      tickets_adicionales: payload.productoEspecial ? 3 : 0,
      tickets_generados: generatedCount,
      created_at: new Date().toISOString(),
    }

    const { data: insertedSale, error: saleError } = await supabase
      .from(SALES_TABLE)
      .insert([salePayload])
      .select()
      .single()

    if (saleError) throw saleError

    const generated = buildTicketRowsForSale(insertedSale.id, payload)
    const { error: ticketError } = await supabase.from(TICKETS_TABLE).insert(generated)
    if (ticketError) throw ticketError

    const ticketRange = getSaleRangeFromTickets(generated)
    const { error: rangeError } = await supabase
      .from(SALES_TABLE)
      .update({
        ticket_inicio: ticketRange.ticket_inicio,
        ticket_fin: ticketRange.ticket_fin,
      })
      .eq('id', insertedSale.id)

    if (rangeError) throw rangeError

    const savedSale = {
      ...normalizeSale({
        ...insertedSale,
        ticket_inicio: ticketRange.ticket_inicio,
        ticket_fin: ticketRange.ticket_fin,
      }),
    }

    sales.value = [savedSale, ...sales.value]
    closeForm()
    await handleExportTickets(generated.map((ticket) => ({
      id: ticket.id,
      numero: ticket.numero,
      hash: ticket.hash_code,
      nombre: ticket.cliente_nombre,
      dni: ticket.dni,
      telefono: ticket.telefono,
      monto: Number(ticket.monto_compra || 0),
      productoEspecial: !!ticket.producto_especial,
      createdAt: ticket.created_at,
    })), `tickets-${dni}-${insertedSale.id}.pdf`)
  } catch (error) {
    console.error('[Tickets] Error al guardar ticket:', error)
    alert('No se pudo guardar el ticket promocional.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(sale) {
  const confirmed = window.confirm(`¿Deseas eliminar este ticket y su registro de venta?`)
  if (!confirmed) return

  deleting.value = true
  try {
    const { error: ticketError } = await supabase.from(TICKETS_TABLE).delete().eq('sale_id', sale.id)
    if (ticketError) throw ticketError

    const { error } = await supabase.from(SALES_TABLE).delete().eq('id', sale.id)
    if (error) throw error

    sales.value = sales.value.filter((item) => item.id !== sale.id)
    if (selectedSaleId.value === sale.id) {
      closeForm()
    }
  } catch (error) {
    console.error('[Tickets] Error al eliminar:', error)
    alert('No se pudo eliminar el ticket.')
  } finally {
    deleting.value = false
  }
}

async function printSale(sale) {
  exporting.value = true
  try {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .select('*')
      .eq('sale_id', sale.id)
      .order('numero', { ascending: true })

    if (error) {
      console.error('[Tickets] Error al cargar tickets:', error)
      alert('No se pudo cargar el ticket para imprimir.')
      return
    }

    const saleTickets = (data || []).map((ticket) => ({
      id: ticket.id,
      numero: ticket.numero,
      hash: ticket.hash_code,
      nombre: ticket.cliente_nombre,
      dni: ticket.dni,
      telefono: ticket.telefono,
      monto: Number(ticket.monto_compra || 0),
      productoEspecial: !!ticket.producto_especial,
      createdAt: ticket.created_at,
    }))

    await handleExportTickets(saleTickets, `tickets-${sale.id}.pdf`)
  } finally {
    exporting.value = false
  }
}

async function downloadSalePdf(sale) {
  await printSale(sale)
}

async function handleExportTickets(tickets, fileName = 'tickets-promocionales.pdf') {
  if (!tickets.length) {
    alert('No hay tickets para exportar.')
    return
  }

  await exportTicketPdfDocument(tickets, fileName, {
    widthMm: 80,
    ticketHeightMm: 62,
    title: 'SIEMBRA Y GANA',
    subtitle: 'Campaña de promoción',
    formatDate,
  })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

onMounted(async () => {
  await loadSales()
})
</script>

<style scoped>
:global(body) {
  background: var(--ticket-page-bg);
  font-family: Inter, 'Segoe UI', sans-serif;
}

* {
  box-sizing: border-box;
}

.tickets-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--ticket-page-bg) 0%, rgba(59, 130, 246, 0.04) 100%);
  padding: 24px 18px 40px;
}

.tickets-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.14em;
  font-weight: 800;
  text-transform: uppercase;
  color: #2563eb;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.8rem);
  color: var(--ticket-text);
}

h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--ticket-text);
}

.primary-button {
  border: none;
  border-radius: 12px;
  background: var(--ticket-button-primary);
  color: var(--ticket-button-primary-text);
  font-weight: 700;
  padding: 12px 18px;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-button:disabled,
.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button {
  border: 1px solid var(--ticket-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--ticket-text);
  background: var(--ticket-card-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: rgba(255, 255, 255, 1);
  border-radius: 50%;
  display: inline-block;
  animation: ticket-spin 0.8s linear infinite;
}

.mini-spinner.danger {
  border-color: rgba(239, 68, 68, 0.45);
  border-top-color: rgba(239, 68, 68, 1);
}

@keyframes ticket-spin {
  to {
    transform: rotate(360deg);
  }
}

.action-button.pdf {
  color: #0ea5e9;
}

.action-button.edit {
  color: #22c55e;
}

.action-button.danger {
  color: #ef4444;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 220px));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 18px 18px 16px;
  background: var(--ticket-card-bg);
  border: 1px solid var(--ticket-border);
  border-radius: 18px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.stat-card span,
.stat-card small {
  display: block;
  color: var(--ticket-muted);
}

.stat-card strong {
  display: block;
  margin: 10px 0 6px;
  font-size: 2.2rem;
  line-height: 1;
  color: var(--ticket-text);
}

.stat-card.accent {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(34, 197, 94, 0.08));
}

.index-panel {
  background: var(--ticket-panel-bg);
  border: 1px solid var(--ticket-border);
  border-radius: 20px;
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.06);
  padding: 18px 16px 20px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.records-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-weight: 700;
  font-size: 0.9rem;
}

.toolbar-row {
  margin-bottom: 18px;
}

.search-input {
  width: 100%;
  border: 1px solid var(--ticket-input-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.98rem;
  background: var(--ticket-input-bg);
  color: var(--ticket-text);
}

.search-input::placeholder {
  color: var(--ticket-muted);
}

.search-input:focus {
  outline: 2px solid rgba(37, 99, 235, 0.15);
  border-color: #2563eb;
}

.table-wrapper {
  overflow-x: auto;
}

.tickets-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
  background: var(--ticket-table-bg);
  border-radius: 12px;
  overflow: hidden;
}

.tickets-table th,
.tickets-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--ticket-border);
  text-align: left;
  vertical-align: middle;
  color: var(--ticket-subtle);
}

.tickets-table th {
  background: var(--ticket-table-head-bg);
  color: var(--ticket-subtle);
  font-size: 0.77rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 800;
}

.tickets-table tbody tr {
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.tickets-table tbody tr:hover {
  background: var(--ticket-row-hover);
}

.tickets-table tbody tr.selected {
  background: rgba(59, 130, 246, 0.08);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.18);
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  text-align: center;
  color: var(--ticket-muted);
}

.empty-state.small {
  min-height: 120px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--ticket-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.print-tickets {
  display: none;
}

@media print {
  :global(body *) { visibility: hidden !important; }
  :global(.print-tickets), :global(.print-ticket), :global(.print-ticket *) { visibility: visible !important; }
  :global(.print-tickets) {
    display: block !important;
    position: static !important;
    width: 80mm !important;
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  :global(.print-ticket) {
    width: 80mm !important;
    min-height: 110px !important;
    padding: 8px 8px 10px !important;
    box-sizing: border-box !important;
    color: #000 !important;
    background: #fff !important;
    font-family: monospace !important;
    font-size: 11px !important;
    text-align: left !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    border-bottom: 1px dashed #000 !important;
    margin: 0 !important;
  }

  .print-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
  }

  .print-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
    border-radius: 4px;
  }

  .campaign-head {
    display: flex;
    flex: 1;
    flex-direction: column;
    line-height: 1.1;
    color: #1f1f1f;
    text-transform: uppercase;
  }

  .campaign-kicker {
    font-size: 7px;
    letter-spacing: 0.12em;
    opacity: 0.7;
  }

  .campaign-head strong {
    font-size: 12px;
    letter-spacing: 0.08em;
    font-weight: 800;
  }

  .print-ticket h1 { margin: 0; font-size: 18px; }
  .print-ticket h2 { margin: 4px 0; color: #000; font-size: 12px; }
  .print-ticket p { margin: 4px 0; text-align: left; }
  .print-ticket .print-number, .print-ticket .print-hash, .print-ticket > p:last-child { text-align: center; }
  .print-ticket .print-number { font-size: 18px; font-weight: 800; }
  .print-rule { border-top: 1px dashed #000; margin: 8px 0; }
  @page {
    size: auto;
    margin: 0;
    marks: none;
  }
}

@media (max-width: 760px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
