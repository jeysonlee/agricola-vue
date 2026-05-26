import { supabase } from '../config/supabase'
import { v4 as uuidv4 } from 'uuid'

// CRUD genérico — mismo patrón que lathing-app/supabase.crud.generic.service.ts
export function useSupabase() {

  async function create(table, data) {
    const now = new Date().toISOString()

    if (!data.id) data.id = uuidv4()
    data.created_at  = now
    data.updated_at  = now
    data.deleted_at  = null
    data.is_synced   = 1
    data.synced_at   = now

    const { error } = await supabase.from(table).insert(data)
    if (error) {
      console.error(`[Supabase] create(${table}):`, error)
      throw new Error(error.message)
    }
    return { id: data.id }
  }

  async function readAll(table, orderBy = 'created_at', ascending = false) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .or('deleted_at.is.null,deleted_at.eq.')
      .order(orderBy, { ascending })

    if (error) {
      console.error(`[Supabase] readAll(${table}):`, error.message)
      throw new Error(error.message)
    }

    return data || []
  }

  async function getById(table, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error(`[Supabase] getById(${table}, ${id}):`, error)
      throw new Error(error.message)
    }
    return data || null
  }

  async function update(table, id, changes) {
    const now = new Date().toISOString()
    changes.updated_at = now
    changes.is_synced  = 1
    changes.synced_at  = now
    delete changes.id

    const { error } = await supabase.from(table).update(changes).eq('id', id)
    if (error) {
      console.error(`[Supabase] update(${table}, ${id}):`, error)
      throw new Error(error.message)
    }
    return { changes: 1 }
  }

  async function remove(table, id) {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: now, updated_at: now, is_synced: 1, synced_at: now })
      .eq('id', id)

    if (error) {
      console.error(`[Supabase] delete(${table}, ${id}):`, error)
      throw new Error(error.message)
    }
    return { changes: 1 }
  }

  async function query(table, select = '*', filters = {}, orderBy = null) {
    let q = supabase.from(table).select(select).is('deleted_at', null)

    for (const [field, value] of Object.entries(filters)) {
      q = q.eq(field, value)
    }
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false })

    const { data, error } = await q
    if (error) {
      console.error(`[Supabase] query(${table}):`, error)
      throw new Error(error.message)
    }
    return data || []
  }

  async function queryIn(table, field, values) {
    if (!values.length) return []
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in(field, values)
      .is('deleted_at', null)
    if (error) throw new Error(error.message)
    return data || []
  }

  return { create, readAll, getById, update, remove, query, queryIn }
}
