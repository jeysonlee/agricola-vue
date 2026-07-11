<template>
  <ion-page>
    <AppHeader :title="pageTitle" :show-back="true" back-href="/tabs/tareas" />

    <ion-content class="form-content">

      <!-- ══ ESTADO ══ -->
      <div class="estado-bar">
        <button v-for="e in ESTADOS" :key="e.v" class="estado-chip" :class="{ active: form.estado === e.v, [e.color]: true }" @click="cambiarEstado(e.v)">
          {{ e.l }}
        </button>
      </div>

      <!-- ══ BANNER COTIZACIÓN ══ -->
      <div v-if="form.estado === 'programada'" class="cotizacion-banner">
        <ion-icon :icon="pricetagOutline" />
        <span>Los costos registrados son una <strong>cotización estimada</strong> — se contabilizarán como gasto real al finalizar la tarea</span>
      </div>

      <!-- ══ INFORMACIÓN BÁSICA ══ -->
      <p class="fsec-label">Información básica</p>
      <ion-list inset class="fsec-list">
        <ion-item>
          <ion-icon :icon="clipboardOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Tipo de Tarea *</ion-label>
          <ion-select v-model="form.tipo_tarea" placeholder="Seleccionar..." interface="action-sheet">
            <ion-select-option v-for="t in TIPOS_TAREA" :key="t" :value="t">{{ t }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-icon :icon="mapOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Parcela *</ion-label>
          <ion-select v-model="form.parcela_id" placeholder="Seleccionar. .." interface="action-sheet">
            <ion-select-option v-for="p in parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-if="isAdmin">
          <ion-icon :icon="personOutline" slot="start" color="primary" class="item-icon" />
          <ion-label position="stacked">Usuario asociado a la parcela</ion-label>
          <ion-select v-model="usuarioParcelaId" placeholder="Seleccionar usuario..." interface="action-sheet" :disabled="!form.parcela_id">
            <ion-select-option v-for="u in usuarios" :key="u.id" :value="u.id">{{ nombreUsuario(u) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-icon :icon="documentTextOutline" slot="start" color="medium" class="item-icon" />
          <ion-label position="stacked">Descripción</ion-label>
          <ion-input v-model="form.descripcion" placeholder="Detalle de la tarea..." />
        </ion-item>
      </ion-list>

      <!-- ══ FECHAS ══ -->
      <p class="fsec-label">Fechas</p>
      <ion-list inset class="fsec-list">
        <template v-if="form.estado === 'programada'">
          <ion-item lines="none" button @click="abrirFecha('programada')">
            <ion-icon :icon="calendarOutline" slot="start" color="primary" class="item-icon" />
            <ion-label position="stacked">Fecha programada *</ion-label>
            <ion-input :value="formatDisplay(form.fecha_programada)" readonly placeholder="dd/mm/yyyy" />
            <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
          </ion-item>
        </template>
        <template v-else-if="form.estado === 'en_ejecucion'">
          <ion-item button :lines="form.fecha_programada ? 'inset' : 'none'" @click="abrirFecha('inicio')">
            <ion-icon :icon="calendarOutline" slot="start" color="warning" class="item-icon" />
            <ion-label position="stacked">Fecha de inicio *</ion-label>
            <ion-input :value="formatDisplay(form.fecha_inicio)" readonly placeholder="dd/mm/yyyy" />
            <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
          </ion-item>
          <ion-item v-if="form.fecha_programada" lines="none" class="ref-item">
            <ion-icon :icon="timeOutline" slot="start" color="medium" class="item-icon" />
            <ion-label color="medium"><p>Programada para: {{ formatDisplay(form.fecha_programada) }}</p></ion-label>
          </ion-item>
        </template>
        <template v-else-if="form.estado === 'finalizada'">
          <ion-item button @click="abrirFecha('fin')">
            <ion-icon :icon="checkmarkCircleOutline" slot="start" color="success" class="item-icon" />
            <ion-label position="stacked">Fecha de finalización *</ion-label>
            <ion-input :value="formatDisplay(form.fecha_fin)" readonly placeholder="dd/mm/yyyy" />
            <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
          </ion-item>
          <ion-item button @click="abrirFecha('inicio')">
            <ion-icon :icon="calendarOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Fecha de inicio</ion-label>
            <ion-input :value="formatDisplay(form.fecha_inicio)" readonly placeholder="—" />
            <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
          </ion-item>
          <ion-item lines="none">
            <ion-icon :icon="timeOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked" color="medium">Programada</ion-label>
            <ion-input :value="formatDisplay(form.fecha_programada)" readonly placeholder="—" />
          </ion-item>
        </template>
        <template v-else>
          <ion-item lines="none">
            <ion-icon :icon="closeCircleOutline" slot="start" color="danger" class="item-icon" />
            <ion-label color="medium">Tarea cancelada — no requiere fechas</ion-label>
          </ion-item>
        </template>
      </ion-list>

      <!-- ══ COSECHA (condicional) ══ -->
      <template v-if="esCosecha">
        <p class="fsec-label">Datos de Cosecha</p>
        <ion-list inset class="fsec-list">
          <ion-item>
            <ion-icon :icon="archiveOutline" slot="start" color="success" class="item-icon" />
            <ion-label>Editar merma (%)</ion-label>
            <ion-toggle v-model="editarMerma" />
          </ion-item>
          <ion-item v-if="editarMerma">
            <ion-icon :icon="settingsOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Merma (%)</ion-label>
            <ion-input v-model.number="form.pctj_merma" inputmode="decimal" @ionInput="onMermaChange" />
          </ion-item>
          <ion-item>
            <ion-icon :icon="archiveOutline" slot="start" color="medium" class="item-icon" />
            <ion-label position="stacked">Baldes</ion-label>
            <ion-input v-model.number="form.cant_baldes" inputmode="decimal" @ionInput="onBaldesChange" />
          </ion-item>
          <ion-item>
            <ion-icon :icon="scaleOutline" slot="start" color="success" class="item-icon" />
            <ion-label position="stacked">Kg Fresco (bruto)</ion-label>
            <ion-input v-model.number="form.cant_kg_fresco" inputmode="decimal" @ionInput="onKgFrescoChange" />
          </ion-item>
          <ion-item lines="none">
            <ion-icon :icon="scaleOutline" slot="start" color="primary" class="item-icon" />
            <ion-label position="stacked">Kg Seco (calculado)</ion-label>
            <ion-input :value="form.cant_kg_secado" readonly />
          </ion-item>
        </ion-list>
      </template>

      <!-- ══ COSTOS ══ -->
      <p class="fsec-label">Costos de la tarea</p>

      <!-- Mano de Obra -->
      <div class="cost-block">
        <div class="cost-block-hdr">
          <span class="cbh-title">
            <ion-icon :icon="peopleOutline" />
            Mano de Obra
          </span>
          <span class="cbh-badges">
            <ion-badge v-if="form.estado === 'programada'" color="warning" class="cost-badge tipo-badge">COTIZ.</ion-badge>
            <ion-badge v-if="totalManoObra > 0" color="primary" class="cost-badge">S/ {{ totalManoObra.toFixed(2) }}</ion-badge>
          </span>
        </div>
        <ion-list inset class="cost-list" v-if="manoObra.length">
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
        <div class="cost-add">
          <ion-button expand="block" fill="outline" color="primary" @click="abrirMO">
            <ion-icon slot="start" :icon="addOutline" /> Agregar mano de obra
          </ion-button>
        </div>
      </div>

      <!-- Insumos -->
      <div class="cost-block">
        <div class="cost-block-hdr">
          <span class="cbh-title">
            <ion-icon :icon="flaskOutline" />
            Insumos y Materiales
          </span>
          <span class="cbh-badges">
            <ion-badge v-if="form.estado === 'programada'" color="warning" class="cost-badge tipo-badge">COTIZ.</ion-badge>
            <ion-badge v-if="totalInsumos > 0" color="tertiary" class="cost-badge">S/ {{ totalInsumos.toFixed(2) }}</ion-badge>
          </span>
        </div>
        <ion-list inset class="cost-list" v-if="insumosUsados.length">
          <ion-item v-for="(row, i) in insumosUsados" :key="i">
            <ion-label>
              <h3>{{ row.nombre }}</h3>
              <p>{{ row.tipo_insumo }} · {{ row.cantidad }} {{ row.unidad || 'und' }} × S/{{ row.costo_unitario }}</p>
            </ion-label>
            <div slot="end" class="item-end-group">
              <span class="item-cost">S/ {{ (+row.subtotal).toFixed(2) }}</span>
              <ion-button fill="clear" color="danger" @click="insumosUsados.splice(i,1); calcTotales()">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
        <div class="cost-add">
          <ion-button expand="block" fill="outline" color="tertiary" @click="abrirInsumo">
            <ion-icon slot="start" :icon="addOutline" /> Agregar insumo
          </ion-button>
        </div>
      </div>

      <!-- Herramientas -->
      <div class="cost-block">
        <div class="cost-block-hdr">
          <span class="cbh-title">
            <ion-icon :icon="hammerOutline" />
            Herramientas y Maquinaria
          </span>
          <span class="cbh-badges">
            <ion-badge v-if="form.estado === 'programada'" color="warning" class="cost-badge tipo-badge">COTIZ.</ion-badge>
            <ion-badge v-if="totalHerramientas > 0" color="warning" class="cost-badge">S/ {{ totalHerramientas.toFixed(2) }}</ion-badge>
          </span>
        </div>
        <ion-list inset class="cost-list" v-if="herramientasUsadas.length">
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
        <div class="cost-add">
          <ion-button expand="block" fill="outline" color="warning" @click="abrirHerr">
            <ion-icon slot="start" :icon="addOutline" /> Agregar herramienta
          </ion-button>
        </div>
      </div>

      <!-- TOTALES -->
      <div class="totales-box" :class="form.estado === 'programada' ? 'totales-cotiz' : 'totales-real'">
        <p class="totales-tag">{{ form.estado === 'programada' ? '📋 Cotización estimada' : '✅ Gasto real' }}</p>
        <div class="total-line"><span>Mano de obra</span><span>S/ {{ totalManoObra.toFixed(2) }}</span></div>
        <div class="total-line"><span>Insumos</span><span>S/ {{ totalInsumos.toFixed(2) }}</span></div>
        <div class="total-line"><span>Herramientas</span><span>S/ {{ totalHerramientas.toFixed(2) }}</span></div>
        <div class="total-line total-line--final">
          <span>{{ form.estado === 'programada' ? 'Costo estimado' : 'Costo total' }}</span>
          <span>S/ {{ totalGeneral.toFixed(2) }}</span>
        </div>
      </div>

      <!-- ══ OBSERVACIONES ══ -->
      <p class="fsec-label">Observaciones</p>
      <ion-list inset class="fsec-list fsec-last">
        <ion-item lines="none">
          <ion-icon :icon="chatboxOutline" slot="start" color="medium" class="item-icon" />
          <ion-label position="stacked">Notas</ion-label>
          <ion-textarea v-model="form.observaciones" :rows="3" placeholder="Observaciones adicionales..." />
        </ion-item>
      </ion-list>

    </ion-content>

    <!-- ══ ACCIÓN GUARDAR / CANCELAR ══ -->
    <ion-footer class="action-footer">
      <ion-toolbar>
        <div class="action-bar">
          <ion-button expand="block" fill="outline" color="medium" @click="router.back()">
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

    <!-- ══ MODAL MANO DE OBRA ══ -->
    <ion-modal :is-open="showManoObra" @didDismiss="showManoObra=false" :breakpoints="[0,0.85]" :initial-breakpoint="0.85">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Mano de Obra</ion-title>
          <ion-buttons slot="end"><ion-button @click="showManoObra=false"><ion-icon :icon="closeOutline" /></ion-button></ion-buttons>
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
        <div class="modal-subtotal"><span>Subtotal</span><strong>S/ {{ newMO.subtotal.toFixed(2) }}</strong></div>
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
          <ion-buttons slot="end"><ion-button @click="showInsumo=false"><ion-icon :icon="closeOutline" /></ion-button></ion-buttons>
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
            <ion-label position="stacked">Unidad de medida</ion-label>
            <ion-select v-model="newInsumo.unidad" interface="action-sheet">
              <ion-select-option v-for="u in UNIDADES_MEDIDA" :key="u.v" :value="u.v">{{ u.l }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Cantidad</ion-label>
            <ion-input v-model.number="newInsumo.cantidad" inputmode="decimal" placeholder="1" @ionInput="calcInsumo" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Costo por {{ newInsumo.unidad || 'unidad' }} (S/.)</ion-label>
            <ion-input v-model.number="newInsumo.costo_unitario" inputmode="decimal" placeholder="0.00" @ionInput="calcInsumo" />
          </ion-item>
        </ion-list>
        <div class="modal-subtotal">
          <span>{{ newInsumo.cantidad || 0 }} {{ newInsumo.unidad || 'und' }} × S/{{ newInsumo.costo_unitario || 0 }}</span>
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
          <ion-buttons slot="end"><ion-button @click="showHerramienta=false"><ion-icon :icon="closeOutline" /></ion-button></ion-buttons>
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
        <div class="modal-subtotal"><span>Subtotal</span><strong>S/ {{ newHerr.subtotal.toFixed(2) }}</strong></div>
        <ion-button expand="block" color="warning" @click="confirmarHerr">
          <ion-icon slot="start" :icon="checkmarkOutline" /> Agregar
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- ══ MODAL FECHA ══ -->
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
          :min="minFecha"
          :max="maxFecha"
          @ionChange="confirmarFecha"
        />
      </ion-content>
    </ion-modal>

  </ion-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonContent, IonItem, IonLabel, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonButton, IonButtons, IonIcon, IonSpinner,
  IonToggle, IonModal, IonDatetime, IonList, IonBadge, IonTitle, IonHeader, IonToolbar, IonFooter,
  toastController,
} from '@ionic/vue'
import {
  checkmarkOutline, addOutline, trashOutline, closeOutline, saveOutline,
  archiveOutline, peopleOutline, flaskOutline, hammerOutline, chatboxOutline,
  calendarOutline, pricetagOutline, mapOutline, clipboardOutline, documentTextOutline,
  chevronForwardOutline, checkmarkCircleOutline, closeCircleOutline, timeOutline,
  scaleOutline, settingsOutline, personOutline,
} from 'ionicons/icons'
import { useTareas } from '../../composables/useTareas'
import { useParcelas } from '../../composables/useParcelas'
import { useAcceso }   from '../../composables/useAcceso'
import { useCosechas } from '../../composables/useCosechas'
import { useCostoObreros } from '../../composables/useCostoObreros'
import { useCostoHerramientas } from '../../composables/useCostoHerramientas'
import { useCostoInsumos } from '../../composables/useCostoInsumos'
import { useNotificaciones } from '../../composables/useNotificaciones'
import { useUsers } from '../../composables/useUsers'
import { useParcelaUsers } from '../../composables/useParcelaUsers'
import { useAuthStore } from '../../stores/auth'

const TIPOS_TAREA = ['Poda de formación','Poda sanitaria','Deshierbo/limpieza','Fertilización','Cosecha','Fermentación y secado','Injertación','Control fitosanitario','Otra tarea']
const TIPOS_INSUMO = [
  { v: 'insecticida', l: 'Insecticida' },
  { v: 'fungicida',   l: 'Fungicida' },
  { v: 'foliar',      l: 'Foliar' },
  { v: 'abono',       l: 'Abono / fertilizante' },
  { v: 'herbicida',   l: 'Herbicida' },
  { v: 'otro',        l: 'Otro' },
]
const UNIDADES_MEDIDA = [
  { v: 'unidad',      l: 'Unidad (und)' },
  { v: 'kg',          l: 'Kilogramo (kg)' },
  { v: 'g',           l: 'Gramo (g)' },
  { v: 'litro',       l: 'Litro (L)' },
  { v: 'ml',          l: 'Mililitro (mL)' },
  { v: 'galon',       l: 'Galón (gal)' },
  { v: 'bolsa',       l: 'Bolsa' },
  { v: 'saco',        l: 'Saco' },
  { v: 'caja',        l: 'Caja' },
]
const ESTADOS = [
  { v: 'programada',   l: 'Programada',   color: 'estado-primary' },
  { v: 'en_ejecucion', l: 'En ejecución', color: 'estado-warning' },
  { v: 'finalizada',   l: 'Finalizada',   color: 'estado-success' },
  { v: 'cancelada',    l: 'Cancelada',    color: 'estado-danger' },
]
const KG_POR_BALDE = 17.5

const route  = useRoute()
const router = useRouter()
const { getOne, crear, editar } = useTareas()
const { getAll: getParcelas } = useParcelas()
const { getParcelasAccesibles } = useAcceso()
const { getAll: getUsuarios, displayName: nombreUsuario } = useUsers()
const { porParcela: parcelaUsersPorParcela, crear: crearParcelaUser, editar: editarParcelaUser } = useParcelaUsers()
const auth = useAuthStore()
const { crear: crearCosecha, editar: editarCosecha, porTarea: cosechasPorTarea } = useCosechas()
const { porTarea: mosPorTarea, crear: crearMO, eliminarPorTarea: eliminarMOs } = useCostoObreros()
const { porTarea: herrPorTarea, crear: crearHerr, eliminarPorTarea: eliminarHerrs } = useCostoHerramientas()
const { porTarea: insPorTarea, crear: crearIns, eliminarPorTarea: eliminarIns } = useCostoInsumos()
const { programarAlarmasTarea, cancelarAlarmasTarea } = useNotificaciones()

const saving   = ref(false)
const parcelas = ref([])
const isEdit   = computed(() => !!route.params.id)
const isAdmin  = computed(() => auth.isAdmin)

// Usuario asociado a la parcela (solo admin/superadmin pueden reasignarlo)
const usuarios              = ref([])
const usuarioParcelaId      = ref('')
const usuarioParcelaOriginal = ref('')
let asignacionProductorId = null

const form = ref({
  tipo_tarea: '', descripcion: '',
  parcela_id: '', estado: 'programada',
  fecha_programada: '', fecha_inicio: '', fecha_fin: '',
  observaciones: '',
  pctj_merma: 60, cant_baldes: null, cant_kg_fresco: null, cant_kg_secado: null,
})

const manoObra           = ref([])
const insumosUsados      = ref([])
const herramientasUsadas = ref([])
const totalManoObra      = ref(0)
const totalInsumos       = ref(0)
const totalHerramientas  = ref(0)
const totalGeneral       = computed(() => totalManoObra.value + totalInsumos.value + totalHerramientas.value)

const showManoObra    = ref(false)
const showInsumo      = ref(false)
const showHerramienta = ref(false)
const editarMerma     = ref(false)

const fechaOpen  = ref(false)
const tipoFecha  = ref('programada')
const tempFecha  = ref('')

let cosechaExistenteId = null

const esCosecha = computed(() => form.value.tipo_tarea?.toLowerCase().includes('cosecha'))

const pageTitle = computed(() => {
  const e = form.value.estado
  if (e === 'programada')   return 'Programando tarea'
  if (e === 'en_ejecucion') return isEdit.value ? 'Editar tarea' : 'Nueva tarea'
  if (e === 'finalizada')   return isEdit.value ? 'Editar tarea' : 'Nueva tarea'
  return isEdit.value ? 'Editar tarea' : 'Nueva tarea'
})

const isFormValid = computed(() => {
  if (!form.value.tipo_tarea || !form.value.parcela_id) return false
  const e  = form.value.estado
  const fp = form.value.fecha_programada
  const fi = form.value.fecha_inicio
  const ff = form.value.fecha_fin
  if (e === 'programada'   && !fp) return false
  if (e === 'en_ejecucion' && !fi) return false
  if (e === 'finalizada'   && !ff) return false
  // Orden: fecha_programada <= fecha_inicio <= fecha_fin
  if (fp && fi && fi < fp) return false
  if (fi && ff && ff < fi) return false
  if (fp && ff && !fi && ff < fp) return false
  return true
})

// Límites dinámicos para el date picker según qué campo se abre
const minFecha = computed(() => {
  if (tipoFecha.value === 'inicio') return form.value.fecha_programada || undefined
  if (tipoFecha.value === 'fin')    return form.value.fecha_inicio || form.value.fecha_programada || undefined
  return undefined
})
const maxFecha = computed(() => {
  if (tipoFecha.value === 'programada') return form.value.fecha_inicio || form.value.fecha_fin || undefined
  if (tipoFecha.value === 'inicio')     return form.value.fecha_fin || undefined
  return undefined
})

// ── Estado ────────────────────────────────────────────────────────────────────

function cambiarEstado(nuevoEstado) {
  form.value.estado = nuevoEstado
  // Cuando pasa a en_ejecucion sin fecha_inicio, sugiere hoy
  if (nuevoEstado === 'en_ejecucion' && !form.value.fecha_inicio) {
    form.value.fecha_inicio = new Date().toISOString().substring(0, 10)
  }
  // Cuando pasa a finalizada sin fecha_fin, sugiere hoy
  if (nuevoEstado === 'finalizada' && !form.value.fecha_fin) {
    form.value.fecha_fin = new Date().toISOString().substring(0, 10)
  }
}

// ── Fecha picker ──────────────────────────────────────────────────────────────

function abrirFecha(tipo) {
  tipoFecha.value = tipo
  const mapa = { programada: form.value.fecha_programada, inicio: form.value.fecha_inicio, fin: form.value.fecha_fin }
  const val  = mapa[tipo]
  tempFecha.value = val ? val + 'T00:00:00' : new Date().toISOString().substring(0, 10) + 'T00:00:00'
  fechaOpen.value = true
}

function confirmarFecha(ev) {
  const val = ev?.detail?.value || tempFecha.value
  if (!val) return
  const iso = (typeof val === 'string' ? val : val.toString()).substring(0, 10)
  if (tipoFecha.value === 'programada') form.value.fecha_programada = iso
  else if (tipoFecha.value === 'inicio') form.value.fecha_inicio    = iso
  else                                    form.value.fecha_fin        = iso
  fechaOpen.value = false
}

function formatDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.substring(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// ── Cosecha ───────────────────────────────────────────────────────────────────

let _lock = false
function onBaldesChange() {
  if (_lock) return; _lock = true
  const b = +form.value.cant_baldes || 0; const m = +form.value.pctj_merma || 0
  const f = round4(b * KG_POR_BALDE)
  form.value.cant_kg_fresco = f; form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function onKgFrescoChange() {
  if (_lock) return; _lock = true
  const f = +form.value.cant_kg_fresco || 0; const m = +form.value.pctj_merma || 0
  form.value.cant_baldes = round4(f / KG_POR_BALDE); form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function onMermaChange() {
  if (_lock) return; _lock = true
  const f = +form.value.cant_kg_fresco || 0; const m = +form.value.pctj_merma || 0
  form.value.cant_kg_secado = round4(f * (1 - m / 100))
  _lock = false
}
function round4(v) { return Math.round(v * 10000) / 10000 }

// ── Mano de obra ──────────────────────────────────────────────────────────────

const newMO = ref({ tipo_trabajo: '', num_obreros: 1, dias: 1, costo_por_obrero: 0, subtotal: 0 })
function abrirMO()     { newMO.value = { tipo_trabajo: '', num_obreros: 1, dias: 1, costo_por_obrero: 0, subtotal: 0 }; showManoObra.value = true }
function calcMO()      { const r = newMO.value; r.subtotal = (+r.num_obreros||0) * (+r.dias||0) * (+r.costo_por_obrero||0) }
function confirmarMO() { calcMO(); manoObra.value.push({...newMO.value}); showManoObra.value = false; calcTotales() }

// ── Insumos ───────────────────────────────────────────────────────────────────

const newInsumo = ref({ tipo_insumo: 'otro', nombre: '', cantidad: 1, unidad: 'unidad', costo_unitario: 0, subtotal: 0 })
function abrirInsumo()     { newInsumo.value = { tipo_insumo: 'otro', nombre: '', cantidad: 1, unidad: 'unidad', costo_unitario: 0, subtotal: 0 }; showInsumo.value = true }
function calcInsumo()      { const r = newInsumo.value; r.subtotal = (+r.cantidad||0) * (+r.costo_unitario||0) }
function confirmarInsumo() { calcInsumo(); insumosUsados.value.push({...newInsumo.value}); showInsumo.value = false; calcTotales() }

// ── Herramientas ──────────────────────────────────────────────────────────────

const newHerr = ref({ nombre: '', modalidad: 'alquilado', cantidad: 1, costo_unitario: 0, subtotal: 0 })
function abrirHerr()    { newHerr.value = { nombre: '', modalidad: 'alquilado', cantidad: 1, costo_unitario: 0, subtotal: 0 }; showHerramienta.value = true }
function calcHerr()     { const r = newHerr.value; r.subtotal = (+r.cantidad||0) * (+r.costo_unitario||0) }
function confirmarHerr(){ calcHerr(); herramientasUsadas.value.push({...newHerr.value}); showHerramienta.value = false; calcTotales() }

// ── Totales ───────────────────────────────────────────────────────────────────

function calcTotales() {
  totalManoObra.value     = manoObra.value.reduce((s, r) => s + (+r.subtotal||0), 0)
  totalInsumos.value      = insumosUsados.value.reduce((s, r) => s + (+r.subtotal||0), 0)
  totalHerramientas.value = herramientasUsadas.value.reduce((s, r) => s + (+r.subtotal||0), 0)
}

// ── Usuario asociado a la parcela (admin/superadmin) ─────────────────────────

async function cargarUsuarioParcela(parcelaId) {
  if (!isAdmin.value || !parcelaId) {
    usuarioParcelaId.value = ''; usuarioParcelaOriginal.value = ''; asignacionProductorId = null
    return
  }
  const asignaciones = await parcelaUsersPorParcela(parcelaId)
  const productor = asignaciones.find(a => a.rol === 'productor') || asignaciones[0] || null
  asignacionProductorId = productor?.id || null
  usuarioParcelaId.value = productor?.user_id || ''
  usuarioParcelaOriginal.value = usuarioParcelaId.value
}

watch(() => form.value.parcela_id, (val) => cargarUsuarioParcela(val))

// ── Carga inicial ─────────────────────────────────────────────────────────────

async function loadData() {
  parcelas.value = await getParcelasAccesibles()
  if (isAdmin.value) usuarios.value = await getUsuarios()
  if (isEdit.value) {
    const tarea = await getOne(route.params.id)
    if (!tarea) return
    form.value = {
      tipo_tarea:       tarea.tipo_tarea || '',
      descripcion:      tarea.descripcion || '',
      parcela_id:       tarea.parcela_id || '',
      estado:           tarea.estado || 'programada',
      fecha_programada: tarea.fecha_programada ? tarea.fecha_programada.substring(0, 10) : (tarea.fecha_inicio ? tarea.fecha_inicio.substring(0, 10) : ''),
      fecha_inicio:     tarea.fecha_inicio ? tarea.fecha_inicio.substring(0, 10) : '',
      fecha_fin:        tarea.fecha_fin    ? tarea.fecha_fin.substring(0, 10)    : '',
      observaciones:    tarea.observaciones || '',
      pctj_merma:       tarea.pctj_merma  ?? 60,
      cant_baldes:      tarea.cant_baldes  ?? null,
      cant_kg_fresco:   tarea.cant_kg_fresco ?? null,
      cant_kg_secado:   tarea.cant_kg_secado ?? null,
    }
    manoObra.value           = await mosPorTarea(tarea.id)
    insumosUsados.value      = await insPorTarea(tarea.id)
    herramientasUsadas.value = await herrPorTarea(tarea.id)
    calcTotales()
    const cosechasVinculadas = await cosechasPorTarea(tarea.id)
    if (cosechasVinculadas.length) cosechaExistenteId = cosechasVinculadas[0].id
  }
}

// ── Guardar ───────────────────────────────────────────────────────────────────

async function guardar() {
  if (!isFormValid.value) return
  saving.value = true
  try {
    const data = {
      tipo_tarea:       form.value.tipo_tarea,
      descripcion:      form.value.descripcion,
      parcela_id:       form.value.parcela_id,
      estado:           form.value.estado,
      fecha_programada: form.value.fecha_programada,
      fecha_inicio:     form.value.fecha_inicio || form.value.fecha_programada,
      fecha_fin:        form.value.fecha_fin,
      observaciones:    form.value.observaciones,
      costo_total:      totalGeneral.value,
    }

    let tareaId = route.params.id
    if (isEdit.value) {
      await editar(tareaId, data)
      // Cancelar alarmas anteriores si cambió la fecha o el estado
      if (form.value.estado !== 'programada') await cancelarAlarmasTarea(tareaId)
    } else {
      const res = await crear(data)
      tareaId = res.id
    }

    // Usuario asociado a la parcela (solo admin/superadmin, si cambió)
    if (isAdmin.value && usuarioParcelaId.value && usuarioParcelaId.value !== usuarioParcelaOriginal.value) {
      if (asignacionProductorId) {
        await editarParcelaUser(asignacionProductorId, { user_id: usuarioParcelaId.value })
      } else {
        await crearParcelaUser({ parcela_id: form.value.parcela_id, user_id: usuarioParcelaId.value, rol: 'productor' })
      }
    }

    // Costos en tablas separadas
    if (isEdit.value) {
      await eliminarMOs(tareaId); await eliminarIns(tareaId); await eliminarHerrs(tareaId)
    }
    for (const r of manoObra.value)
      await crearMO({ tarea_id: tareaId, tipo_trabajo: r.tipo_trabajo, num_obreros: +r.num_obreros, dias: +r.dias, costo_por_obrero: +r.costo_por_obrero, subtotal: +r.subtotal })
    for (const r of insumosUsados.value)
      await crearIns({ tarea_id: tareaId, tipo_insumo: r.tipo_insumo, nombre: r.nombre, unidad: r.unidad || 'unidad', cantidad: +r.cantidad, costo_unitario: +r.costo_unitario, subtotal: +r.subtotal })
    for (const r of herramientasUsadas.value)
      await crearHerr({ tarea_id: tareaId, nombre: r.nombre, modalidad: r.modalidad, cantidad: +r.cantidad, costo_unitario: +r.costo_unitario, subtotal: +r.subtotal })

    // Cosecha
    if (esCosecha.value) {
      const cosechaData = {
        parcela_id: form.value.parcela_id, tarea_id: tareaId,
        fecha_cosecha: form.value.fecha_fin || form.value.fecha_programada,
        pctj_merma: form.value.pctj_merma, cant_baldes: form.value.cant_baldes,
        kg_bruto: form.value.cant_kg_fresco, kg_seco: form.value.cant_kg_secado,
      }
      if (cosechaExistenteId) {
        await editarCosecha(cosechaExistenteId, cosechaData)
      } else {
        await crearCosecha({ ...cosechaData, kg_bruto_disponible: cosechaData.kg_bruto || 0, kg_seco_disponible: cosechaData.kg_seco || 0, estado: 'COSECHADO' })
      }
    }

    // Notificaciones nativas (solo en dispositivo y si estado = programada)
    if (Capacitor.isNativePlatform() && form.value.estado === 'programada' && form.value.fecha_programada) {
      await programarAlarmasTarea({ id: tareaId, ...data })
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
/* ── Content ── */
.form-content {
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 90px;
}

/* ── Estado chips ── */
.estado-bar {
  display: flex; gap: 8px; padding: 14px 16px 8px;
  overflow-x: auto; scrollbar-width: none;
}
.estado-bar::-webkit-scrollbar { display: none; }
.estado-chip {
  flex-shrink: 0;
  padding: 8px 18px; border-radius: 20px; border: 2px solid transparent;
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
  background: var(--ion-color-step-100); color: var(--ion-color-step-600);
  transition: all 0.15s;
}
.estado-chip.active.estado-primary { background: var(--ion-color-primary); color: #fff; border-color: var(--ion-color-primary); }
.estado-chip.active.estado-warning { background: var(--ion-color-warning); color: #fff; border-color: var(--ion-color-warning); }
.estado-chip.active.estado-success { background: var(--ion-color-success); color: #fff; border-color: var(--ion-color-success); }
.estado-chip.active.estado-danger  { background: var(--ion-color-danger);  color: #fff; border-color: var(--ion-color-danger); }

/* ── Banner cotización ── */
.cotizacion-banner {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.3);
  border-radius: 12px; padding: 12px 14px; margin: 0 16px 4px;
  font-size: 0.8rem; color: var(--ion-color-warning-shade); line-height: 1.5;
}
.cotizacion-banner ion-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
.cotizacion-banner strong { font-weight: 700; }

/* ── Section labels ── */
.fsec-label {
  font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--ion-color-medium);
  padding: 20px 32px 4px; margin: 0;
}

/* ── Form lists ── */
.fsec-list { margin-bottom: 0 !important; }
.fsec-last { margin-bottom: 8px !important; }

/* ── Item icon ── */
.item-icon { font-size: 1.15rem; flex-shrink: 0; }

/* ── Ref item ── */
.ref-item { --min-height: 38px; }

/* ── Cost blocks ── */
.cost-block { margin: 0 0 4px; }
.cost-block-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 32px 6px;
}
.cbh-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.82rem; font-weight: 700; color: var(--ion-text-color);
}
.cbh-badges { display: flex; gap: 4px; align-items: center; }
.cost-badge { font-size: 0.72rem; padding: 3px 8px; border-radius: 20px; }
.tipo-badge { font-size: 0.62rem; letter-spacing: 0.04em; }
.cost-list { margin-top: 0 !important; margin-bottom: 0 !important; }
.cost-add { padding: 8px 16px 4px; }
.cost-add ion-button { --border-radius: 10px; height: 44px; font-weight: 600; }

/* ── Item end group ── */
.item-end-group { display: flex; align-items: center; gap: 2px; }
.item-cost { font-weight: 700; font-size: 0.85rem; color: var(--ion-color-success); white-space: nowrap; }

/* ── Totales box ── */
.totales-box {
  margin: 12px 16px 8px;
  border-radius: 14px;
  padding: 16px 18px;
}
.totales-cotiz {
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.25);
}
.totales-real {
  background: rgba(var(--ion-color-success-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-success-rgb), 0.25);
}
.totales-tag {
  font-size: 0.75rem; font-weight: 600; color: var(--ion-color-medium);
  margin: 0 0 10px;
}
.total-line {
  display: flex; justify-content: space-between;
  font-size: 0.85rem; color: var(--ion-text-color);
  margin-bottom: 6px;
}
.total-line--final {
  border-top: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.12);
  padding-top: 10px; margin-top: 4px; margin-bottom: 0;
  font-weight: 700; font-size: 1rem;
}
.total-line--final span:last-child { font-size: 1.25rem; font-weight: 800; }

/* ── Sub-modal subtotal ── */
.modal-subtotal {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--ion-color-step-100); border-radius: 12px;
  padding: 14px 18px; margin: 0 0 16px; font-size: 0.95rem; color: var(--ion-color-medium);
}
.modal-subtotal strong { font-size: 1.2rem; font-weight: 800; color: var(--ion-color-success); }

/* ── Date picker ── */
@media (prefers-color-scheme: light) { .datetime-tema { --ion-color-primary: #174437; } }
@media (prefers-color-scheme: dark)  { .datetime-tema { --ion-color-primary: #54b69a; } }

/* ── Action footer ── */
.action-footer ion-toolbar {
  --background: var(--ion-background-color);
  --border-color: transparent;
  box-shadow: 0 -2px 16px rgba(0,0,0,0.1);
}
.action-bar { display: flex; gap: 12px; padding: 10px 16px 14px; }
.action-bar ion-button { flex: 1; --border-radius: 12px; height: 50px; font-size: 0.95rem; font-weight: 700; }
</style>
