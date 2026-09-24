<template>
  <div class="form-shell">
    <div class="form-header">
      <h3>{{ isEdit ? 'Editar ticket' : 'Nuevo ticket' }}</h3>
      <button type="button" class="close-button" @click="$emit('cancel')">×</button>
    </div>

    <form class="ticket-form" @submit.prevent="submitForm">
      <div class="field-grid">
        <label class="field">
          <span>Nombre completo</span>
          <input v-model="form.nombre" type="text" placeholder="Nombres y apellidos" maxlength="80" required />
          <small v-if="validation.nombre" class="field-error">{{ validation.nombre }}</small>
        </label>

        <label class="field">
          <span>DNI</span>
          <input v-model="form.dni" type="text" inputmode="numeric" placeholder="12345678" maxlength="8" required />
          <small v-if="validation.dni" class="field-error">{{ validation.dni }}</small>
        </label>

        <label class="field">
          <span>Teléfono</span>
          <input v-model="form.telefono" type="tel" inputmode="numeric" placeholder="999 999 999" maxlength="9" required />
          <small v-if="validation.telefono" class="field-error">{{ validation.telefono }}</small>
        </label>

        <label class="field">
          <span>Monto de compra (S/)</span>
          <input v-model.number="form.monto" type="number" min="0" step="0.01" placeholder="0.00" required />
        </label>
      </div>

      <label class="toggle-row">
        <input v-model="form.productoEspecial" type="checkbox" />
        <span>¿Compró productos especiales? (+3 tickets)</span>
      </label>

      <div class="calculation" :class="{ warning: baseTickets === 0 }">
        <span>Tickets a generar</span>
        <strong>{{ totalTickets }}</strong>
        <small v-if="baseTickets === 0">Se requiere un mínimo de S/ 100 para generar tickets.</small>
        <small v-else>{{ baseTickets }} por monto + {{ form.productoEspecial ? 3 : 0 }} especiales</small>
      </div>

      <div class="actions">
        <button type="button" class="btn secondary" @click="$emit('cancel')" :disabled="saving">Cancelar</button>
        <button type="submit" class="btn primary" :disabled="saving || !canSubmit">
          <span v-if="saving" class="btn-spinner" aria-hidden="true"></span>
          {{ saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear ticket' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import './tickets-theme.css'

const props = defineProps({
  sale: {
    type: Object,
    default: null,
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'cancel'])

const form = reactive({
  nombre: '',
  dni: '',
  telefono: '',
  monto: 0,
  productoEspecial: false,
})

const validateName = (value = '') => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return 'Ingrese un nombre válido'
  if (trimmed.length < 2) return 'Ingrese un nombre válido'
  if (/\d/.test(trimmed)) return 'El nombre no puede contener números'
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s.'-]+$/.test(trimmed)) return 'El nombre solo puede contener letras y espacios'
  return ''
}

const validateDni = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (!digits) return 'El DNI es obligatorio'
  if (!/^\d{8}$/.test(digits)) return 'El DNI debe tener 8 dígitos'
  return ''
}

const validateTelefono = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 9)
  if (!digits) return 'El teléfono es obligatorio'
  if (!/^\d{9}$/.test(digits)) return 'El teléfono debe tener 9 dígitos'
  return ''
}

const validation = computed(() => ({
  nombre: validateName(form.nombre),
  dni: validateDni(form.dni),
  telefono: validateTelefono(form.telefono),
}))

const isEdit = computed(() => Boolean(props.sale))
const baseTickets = computed(() => Math.max(0, Math.floor(Number(form.monto || 0) / 100)))
const totalTickets = computed(() => baseTickets.value + (form.productoEspecial ? 3 : 0))
const canSubmit = computed(() => {
  const hasValidName = !validateName(form.nombre)
  const hasValidDni = !validateDni(form.dni)
  const hasValidTelefono = !validateTelefono(form.telefono)
  const hasEnoughAmount = Number(form.monto || 0) >= 100

  return hasValidName && hasValidDni && hasValidTelefono && hasEnoughAmount
})

function resetForm() {
  form.nombre = ''
  form.dni = ''
  form.telefono = ''
  form.monto = 0
  form.productoEspecial = false
}

watch(
  () => props.sale,
  (sale) => {
    if (sale) {
      form.nombre = sale.nombre || ''
      form.dni = String(sale.dni || '').replace(/\D/g, '').slice(0, 8)
      form.telefono = String(sale.telefono || '').replace(/\D/g, '').slice(0, 9)
      form.monto = Number(sale.monto || 0)
      form.productoEspecial = Boolean(sale.productoEspecial)
      return
    }

    resetForm()
  },
  { immediate: true },
)

watch(
  () => form.dni,
  (value) => {
    form.dni = String(value || '').replace(/\D/g, '').slice(0, 8)
  },
)

watch(
  () => form.telefono,
  (value) => {
    form.telefono = String(value || '').replace(/\D/g, '').slice(0, 9)
  },
)

function submitForm() {
  if (!canSubmit.value) return

  const dni = String(form.dni || '').trim()
  if (!/^\d{8}$/.test(dni)) return

  emit('submit', {
    id: props.sale?.id || null,
    nombre: form.nombre.trim(),
    dni,
    telefono: form.telefono.trim(),
    monto: Number(form.monto),
    productoEspecial: !!form.productoEspecial,
    ticketsGenerados: totalTickets.value,
  })
}
</script>

<style scoped>
.form-shell {
  width: min(560px, 92vw);
  background: var(--ticket-panel-bg);
  border-radius: 18px;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
  border: 1px solid var(--ticket-border);
  overflow: hidden;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid var(--ticket-border);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(148, 163, 184, 0.08));
}

.form-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: var(--ticket-text);
}

.close-button {
  border: none;
  background: transparent;
  font-size: 2rem;
  line-height: 1;
  color: var(--ticket-subtle);
  cursor: pointer;
}

.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: var(--ticket-subtle);
}

.field span {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ticket-subtle);
}

.field input {
  width: 100%;
  border: 1px solid var(--ticket-input-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 1rem;
  background: var(--ticket-input-bg);
  color: var(--ticket-text);
  box-sizing: border-box;
}

.field input::placeholder {
  color: var(--ticket-muted);
}

.field input:focus {
  outline: 2px solid rgba(59, 130, 246, 0.18);
  border-color: #3b82f6;
}

.field-error {
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: -4px;
}

.field input:invalid {
  border-color: #fca5a5;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--ticket-card-bg);
  border: 1px solid var(--ticket-border);
  color: var(--ticket-subtle);
}

.toggle-row input {
  width: 16px;
  height: 16px;
}

.calculation {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--ticket-success-bg);
  border: 1px solid var(--ticket-success-border);
  color: var(--ticket-success-text);
}

.calculation strong {
  font-size: 2rem;
  line-height: 1;
  text-align: right;
}

.calculation small {
  grid-column: 1 / -1;
  color: var(--ticket-subtle);
}

.calculation.warning {
  background: var(--ticket-warning-bg);
  border-color: var(--ticket-warning-border);
  color: var(--ticket-warning-text);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.btn {
  appearance: none;
  border: none;
  border-radius: 12px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-top-color: rgba(255, 255, 255, 1);
  border-radius: 50%;
  display: inline-block;
  animation: ticket-spin 0.8s linear infinite;
}

@keyframes ticket-spin {
  to {
    transform: rotate(360deg);
  }
}

.btn.primary {
  background: var(--ticket-button-primary);
  color: var(--ticket-button-primary-text);
}

.btn.secondary {
  background: var(--ticket-button-secondary);
  color: var(--ticket-button-secondary-text);
}

@media (max-width: 640px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
