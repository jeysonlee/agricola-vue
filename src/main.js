import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './stores/auth'
import { initSQLite } from './composables/useSQLite'

import { IonicVue } from '@ionic/vue'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Dark mode */
import '@ionic/vue/css/palettes/dark.system.css'

/* Theme variables */
import './theme/variables.css'

// jeep-sqlite solo se necesita en web (emula SQLite via IndexedDB)
if (typeof window !== 'undefined' && !window.Capacitor?.isNativePlatform?.()) {
  jeepSqlite(window)
}

const pinia = createPinia()
const app = createApp(App).use(IonicVue).use(pinia).use(router)

// Ionic web components reorganizan su shadow DOM después de que Vue guarda referencias
// a nodos ancla, causando este DOMException inofensivo al insertar elementos dinámicos.
app.config.errorHandler = (err) => {
  if (err instanceof DOMException && err.message.includes('insertBefore')) return
  console.error('[App Error]', err)
}

// Ionic lanza este warning cuando la ruta activa no tiene un ion-tab-button asociado
// (ej. rutas secundarias accedidas desde el modal "Más"). Es inofensivo.
const _consoleError = console.error.bind(console)
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('ion-tabs') && args[0].includes('does not exist')) return
  _consoleError(...args)
}

router.isReady().then(async () => {
  const auth = useAuthStore(pinia)
  await auth.restoreSession()

  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
  if (isNative) {
    try {
      await initSQLite()
    } catch (e) {
      console.warn('[SQLite] init failed:', e.message)
    }
  }

  app.mount('#app')
})
