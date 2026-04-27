<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <!-- Bottom tabs: solo visibles en móvil (CSS oculta en md+) -->
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Inicio</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="parcelas" href="/tabs/parcelas">
          <ion-icon :icon="mapOutline" />
          <ion-label>Parcelas</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tareas" href="/tabs/tareas">
          <ion-icon :icon="clipboardOutline" />
          <ion-label>Tareas</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="cosechas" href="/tabs/cosechas">
          <ion-icon :icon="leafOutline" />
          <ion-label>Cosechas</ion-label>
        </ion-tab-button>

        <ion-tab-button @click="openMenuModal">
          <ion-icon :icon="menuOutline" />
          <ion-label>Más</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Modal "Más" para móvil -->
    <ion-modal
      :is-open="menuOpen"
      @didDismiss="menuOpen = false"
      :breakpoints="[0, 0.65]"
      :initial-breakpoint="0.65"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Módulos</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="menuOpen = false">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list>
          <ion-item button @click="navigate('/tabs/cosechas')">
            <ion-icon :icon="leafOutline"           slot="start" color="success" />
            <ion-label>Cosechas</ion-label>
          </ion-item>
          <ion-item button @click="navigate('/tabs/ventas')">
            <ion-icon :icon="cashOutline"           slot="start" color="warning" />
            <ion-label>Ventas</ion-label>
          </ion-item>
          <ion-item button @click="navigate('/tabs/obreros')">
            <ion-icon :icon="peopleOutline"         slot="start" color="primary" />
            <ion-label>Obreros</ion-label>
          </ion-item>
<ion-item button @click="navigate('/tabs/movimientos')">
            <ion-icon :icon="swapHorizontalOutline" slot="start" color="danger" />
            <ion-label>Movimientos</ion-label>
          </ion-item>
          <ion-item button @click="navigate('/tabs/users')">
            <ion-icon :icon="personOutline"         slot="start" color="dark" />
            <ion-label>Usuarios</ion-label>
          </ion-item>
          <ion-item button lines="none" @click="handleLogout">
            <ion-icon :icon="logOutOutline"         slot="start" color="danger" />
            <ion-label color="danger">Cerrar sesión</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
  IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonContent, IonList, IonItem, alertController,
} from '@ionic/vue'
import {
  homeOutline, mapOutline, clipboardOutline, menuOutline,
  closeOutline, leafOutline, cashOutline, peopleOutline,
  swapHorizontalOutline, personOutline, logOutOutline,
} from 'ionicons/icons'
import { useAuthStore } from '../stores/auth'

const router  = useRouter()
const auth    = useAuthStore()
const menuOpen = ref(false)

function openMenuModal() { menuOpen.value = true }
function navigate(path)  { menuOpen.value = false; router.push(path) }

async function handleLogout() {
  menuOpen.value = false
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message: '¿Estás seguro de que deseas salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Salir', role: 'destructive',
        handler: async () => { await auth.logout(); router.replace('/login') },
      },
    ],
  })
  alert.present()
}
</script>
