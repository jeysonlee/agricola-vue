import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSyncStore = defineStore('sync', () => {
  const syncing      = ref(false)
  const lastSync     = ref(null)   // ISO string
  const errors       = ref([])
  const pendingCount = ref(0)      // registros locales no sincronizados

  function setLastSync() {
    lastSync.value = new Date().toISOString()
  }

  return { syncing, lastSync, errors, pendingCount, setLastSync }
})
