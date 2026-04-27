import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const DB_NAME    = 'agricola'
const SETUP_KEY  = 'agricola_db_ready'
const DB_VERSION = 1

const sqlite = new SQLiteConnection(CapacitorSQLite)
let   db     = null
let   isWeb  = false

export async function initSQLite() {
  if (db) return db

  const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'
  isWeb = platform === 'web'

  if (isWeb) {
    await CapacitorSQLite.initWebStore()
  } else if (platform === 'android') {
    await CapacitorSQLite.requestPermissions()
  }

  const { value: ready } = await Preferences.get({ key: SETUP_KEY })

  db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
  await db.open()

  if (!ready) {
    const schema = await fetch('/assets/db/db.json').then(r => r.json())
    const jsonStr = JSON.stringify(schema)
    const valid = await CapacitorSQLite.isJsonValid({ jsonstring: jsonStr })
    if (valid.result) {
      await CapacitorSQLite.importFromJson({ jsonstring: jsonStr })
    }
    await Preferences.set({ key: SETUP_KEY, value: '1' })
  }

  console.log('[SQLite] DB lista:', DB_NAME)
  return db
}

export function getSQLite() {
  return db
}

export function getIsWeb() {
  return isWeb
}

export async function saveWebStore() {
  if (isWeb) await CapacitorSQLite.saveToStore({ database: DB_NAME })
}
