import { v4 as uuidv4 } from 'uuid'
import { getSQLite, saveWebStore } from './useSQLite'

// Caché de columnas por tabla para filtrar columnas extra de Supabase
const _colCache = {}

async function _getTableCols(d, table) {
  if (!_colCache[table]) {
    const res = await d.query(`PRAGMA table_info(${table})`)
    _colCache[table] = new Set((res.values || []).map(r => r.name))
  }
  return _colCache[table]
}

// Mismo API que useSupabase.js — drop-in replacement para modo offline

export function useLocalDB() {

  function db() {
    const d = getSQLite()
    if (!d) throw new Error('[LocalDB] SQLite no inicializada')
    return d
  }

  async function create(table, data) {
    const now = new Date().toISOString()
    if (!data.id) data.id = uuidv4()
    data.created_at = now
    data.updated_at = now
    data.deleted_at = null
    data.is_synced  = 0
    data.synced_at  = null

    const cols  = Object.keys(data)
    const vals  = Object.values(data)
    const marks = cols.map(() => '?').join(', ')
    const stmt  = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${marks})`

    await db().run(stmt, vals)
    await saveWebStore()
    return { id: data.id }
  }

  async function readAll(table, orderBy = 'created_at', ascending = false) {
    const dir = ascending ? 'ASC' : 'DESC'
    const res = await db().query(
      `SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY ${orderBy} ${dir}`
    )
    return res.values || []
  }

  async function getById(table, id) {
    const res = await db().query(
      `SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    )
    return res.values?.[0] || null
  }

  async function update(table, id, changes) {
    const now = new Date().toISOString()
    delete changes.id
    changes.updated_at = now
    changes.is_synced  = 0
    changes.synced_at  = null

    const sets = Object.keys(changes).map(k => `${k} = ?`).join(', ')
    const vals = [...Object.values(changes), id]
    await db().run(`UPDATE ${table} SET ${sets} WHERE id = ?`, vals)
    await saveWebStore()
    return { changes: 1 }
  }

  async function remove(table, id) {
    const now = new Date().toISOString()
    await db().run(
      `UPDATE ${table} SET deleted_at = ?, updated_at = ?, is_synced = 0, synced_at = NULL WHERE id = ?`,
      [now, now, id]
    )
    await saveWebStore()
    return { changes: 1 }
  }

  async function query(table, select = '*', filters = {}, orderBy = null) {
    let sql  = `SELECT ${select} FROM ${table} WHERE deleted_at IS NULL`
    const params = []
    for (const [k, v] of Object.entries(filters)) {
      sql += ` AND ${k} = ?`
      params.push(v)
    }
    if (orderBy) sql += ` ORDER BY ${orderBy.column} ${orderBy.ascending ? 'ASC' : 'DESC'}`
    const res = await db().query(sql, params)
    return res.values || []
  }

  // Devuelve todos los registros no sincronizados (incluyendo soft-deleted)
  async function getUnsynced(table) {
    const res = await db().query(
      `SELECT * FROM ${table} WHERE is_synced = 0`
    )
    return res.values || []
  }

  // Marca un registro como sincronizado
  async function markSynced(table, id) {
    const now = new Date().toISOString()
    await db().run(
      `UPDATE ${table} SET is_synced = 1, synced_at = ? WHERE id = ?`,
      [now, id]
    )
    await saveWebStore()
  }

  // Inserta o actualiza desde remoto (ya sincronizado).
  // Filtra columnas que no existen en SQLite para evitar errores por esquemas distintos.
  async function upsertFromRemote(table, row) {
    const now = new Date().toISOString()
    const d = db()
    const known = await _getTableCols(d, table)

    const filtered = { is_synced: 1, synced_at: now }
    for (const [k, v] of Object.entries(row)) {
      if (known.has(k)) filtered[k] = v
    }

    const cols  = Object.keys(filtered)
    const vals  = Object.values(filtered)
    const marks = cols.map(() => '?').join(', ')
    await d.run(
      `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${marks})`,
      vals
    )
    await saveWebStore()
  }

  async function queryIn(table, field, values) {
    if (!values.length) return []
    const marks = values.map(() => '?').join(', ')
    const res = await db().query(
      `SELECT * FROM ${table} WHERE deleted_at IS NULL AND ${field} IN (${marks})`,
      values
    )
    return res.values || []
  }

  return { create, readAll, getById, update, remove, query, queryIn, getUnsynced, markSynced, upsertFromRemote }
}
