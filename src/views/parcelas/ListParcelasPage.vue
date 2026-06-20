<template>
  <ion-page>
    <AppHeader title="Parcelas">
      <template #end>
        <ion-button @click="openForm(null)">
          <ion-icon slot="icon-only" :icon="addOutline" />
        </ion-button>
      </template>
      <template #below>
        <ion-toolbar>
          <ion-searchbar v-model="searchText" placeholder="Buscar parcela..." />
        </ion-toolbar>
      </template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="!loading && filtered.length" class="list-card">
        <ion-list lines="none">
          <ion-item-sliding v-for="item in filtered" :key="item.id">
            <ion-item button detail @click="openForm(item)">
              <div slot="start" class="item-avatar av-primary">
                <ion-icon :icon="mapOutline" />
              </div>
              <ion-label>
                <h3>{{ item.nombre }}</h3>
                <p>{{ [item.ubicacion, item.cultivo].filter(Boolean).join(' · ') || '—' }}</p>
                <p v-if="item.area">{{ item.area }} ha</p>
              </ion-label>
              <div slot="end" class="item-end">
                <span class="end-val">{{ item.area ?? '—' }}</span>
                <span class="end-sub">hectáreas</span>
              </div>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" :disabled="eliminando === item.id" @click="confirmarEliminar(item)">
                <ion-spinner v-if="eliminando === item.id" name="crescent" style="width:18px;height:18px" />
                <ion-icon v-else slot="icon-only" :icon="trashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <div v-else-if="!loading && !filtered.length" class="empty-state">
        <ion-icon :icon="mapOutline" class="empty-icon" />
        <h3>Sin parcelas</h3>
        <p>No hay parcelas registradas aún</p>
        <ion-button @click="openForm(null)">Agregar Parcela</ion-button>
      </div>
    </ion-content>

    <ion-loading :is-open="loading" message="Cargando..." />

    <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
      <FormParcelaModal
        :parcela="selected"
        :is-superadmin="isSuperadmin"
        :usuarios="usuarios"
        :current-user-id="auth.currentUser?.id || ''"
        @saved="onSaved"
        @cancel="formOpen = false"
      />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  IonPage, IonToolbar, IonButton, IonIcon, IonSpinner,
  IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonLoading,
  IonModal, alertController, toastController,
} from '@ionic/vue'
import { addOutline, mapOutline, trashOutline } from 'ionicons/icons'
import { useParcelas }          from '../../composables/useParcelas'
import { useTareas }            from '../../composables/useTareas'
import { useCosechas }          from '../../composables/useCosechas'
import { useVentaDetalle }      from '../../composables/useVentaDetalle'
import { useCostoObreros }      from '../../composables/useCostoObreros'
import { useCostoHerramientas } from '../../composables/useCostoHerramientas'
import { useCostoInsumos }      from '../../composables/useCostoInsumos'
import { useNotificaciones }    from '../../composables/useNotificaciones'
import { useUsers }             from '../../composables/useUsers'
import { useAuthStore }         from '../../stores/auth'
import FormParcelaModal         from './FormParcelaModal.vue'

const { getAll, getAllPorUsuario, eliminar }                     = useParcelas()
const { porParcela: tareasPorParcela, eliminar: eliminarTarea } = useTareas()
const { porTarea: cosechasPorTarea, eliminar: eliminarCosecha } = useCosechas()
const { porCosecha: detallesPorCosecha }                        = useVentaDetalle()
const { eliminarPorTarea: eliminarMOs }                         = useCostoObreros()
const { eliminarPorTarea: eliminarHerrs }                       = useCostoHerramientas()
const { eliminarPorTarea: eliminarIns }                         = useCostoInsumos()
const { cancelarAlarmasTarea }                                  = useNotificaciones()
const { getAll: getUsuarios }                                   = useUsers()
const auth = useAuthStore()

const items      = ref([])
const usuarios   = ref([])
const searchText = ref('')
const loading    = ref(false)
const eliminando = ref(null)
const formOpen   = ref(false)
const selected   = ref(null)

const isSuperadmin = computed(() => {
  const role = auth.currentUser?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin'
})

const filtered = computed(() =>
  items.value.filter(i =>
    !searchText.value ||
    i.nombre?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.ubicacion?.toLowerCase().includes(searchText.value.toLowerCase()) ||
    i.cultivo?.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    if (isSuperadmin.value) {
      const [parcelas, users] = await Promise.all([getAll(), getUsuarios()])
      items.value    = parcelas
      usuarios.value = users
    } else {
      items.value = await getAllPorUsuario(auth.currentUser?.id)
    }
  } catch { showToast('Error al cargar parcelas', 'danger') }
  finally { loading.value = false }
}

function openForm(item) { selected.value = item; formOpen.value = true }

async function onSaved() {
  formOpen.value = false
  await loadData()
  showToast('Parcela guardada correctamente', 'success')
}

async function confirmarEliminar(item) {
  // 1. Recopilar tareas y sus cosechas para validar antes de mostrar el alert
  const tareas = await tareasPorParcela(item.id)
  const cosechasMap = new Map()

  for (const t of tareas) {
    const cosechas = await cosechasPorTarea(t.id)
    cosechasMap.set(t.id, cosechas)

    // Bloquear si alguna cosecha ya tiene ventas: no se puede hacer el cascade seguro
    for (const c of cosechas) {
      const detalles = await detallesPorCosecha(c.id)
      if (detalles.length > 0) {
        const a = await alertController.create({
          header: 'No se puede eliminar',
          message: `"${item.nombre}" tiene tareas con cosechas que ya tienen ventas registradas. Elimina primero las ventas vinculadas antes de borrar la parcela.`,
          buttons: ['Entendido'],
        })
        return a.present()
      }
    }
  }

  // 2. Construir mensaje de cascada informativo
  const totalCosechas = [...cosechasMap.values()].flat()
  const lineas = [`¿Eliminar la parcela "${item.nombre}"?`]
  if (tareas.length > 0) {
    lineas.push(`Se eliminarán ${tareas.length} tarea(s) y todos sus costos registrados (mano de obra, insumos, herramientas).`)
  }
  if (totalCosechas.length > 0) {
    lineas.push(`También se eliminarán ${totalCosechas.length} cosecha(s) sin ventas.`)
  }
  lineas.push('Se revocarán las asignaciones de usuarios a esta parcela.')

  const alert = await alertController.create({
    header: 'Eliminar Parcela',
    message: lineas.join(' '),
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: async () => {
          eliminando.value = item.id
          try {
            // Cascade: para cada tarea → costos + cosechas + alarmas → tarea
            for (const t of tareas) {
              await Promise.all([
                eliminarMOs(t.id),
                eliminarIns(t.id),
                eliminarHerrs(t.id),
              ])
              const cosechas = cosechasMap.get(t.id) || []
              for (const c of cosechas) await eliminarCosecha(c.id)
              await cancelarAlarmasTarea(t.id)
              await eliminarTarea(t.id)
            }
            // Elimina parcela_users + la parcela
            await eliminar(item.id)
            await loadData()
            showToast('Parcela eliminada', 'warning')
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
  const t = await toastController.create({ message, duration: 2000, color, position: 'top' })
  t.present()
}

onIonViewWillEnter(loadData)
onMounted(loadData)
</script>

<style scoped>
/* ── List design ── */
.list-card {
  margin: 8px 12px 16px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 8px rgba(0,0,0,.08);
  background: var(--ion-item-background, #fff);
}
.list-card ion-list { padding: 0; background: transparent; }

ion-item {
  --padding-start: 14px;
  --inner-padding-end: 6px;
  --min-height: 72px;
  --background: transparent;
  --border-color: rgba(0,0,0,.06);
  --detail-icon-color: var(--ion-color-medium);
  --detail-icon-font-size: 14px;
}
ion-label h3 { font-size: 15px !important; font-weight: 700 !important; color: var(--ion-color-dark) !important; margin-bottom: 2px !important; }
ion-label p  { font-size: 13px !important; color: var(--ion-color-medium-shade) !important; margin: 0 !important; }

.item-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 4px;
}
.item-avatar ion-icon { font-size: 22px; color: #fff; }
.av-primary  { background: var(--ion-color-primary); }
.av-success  { background: var(--ion-color-success); }

.item-end { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.end-val  { font-size: 16px; font-weight: 700; color: var(--ion-color-dark); }
.end-sub  { font-size: 11px; color: var(--ion-color-medium); }

/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 64px 28px; text-align: center;
}
.empty-icon { font-size: 56px; color: var(--ion-color-medium); opacity: .4; }
.empty-state h3 { font-size: 18px; font-weight: 700; color: var(--ion-color-dark); margin: 0; }
.empty-state p  { font-size: 14px; color: var(--ion-color-medium); margin: 0; }
</style>
