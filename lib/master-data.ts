import { supabase } from './supabase'
import { ORG_MATRIX, ROLE_LABEL, type Role } from './accounts'

export interface MasterRole {
  id: string
  name: string
  description?: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export interface MasterDepartment {
  id: string
  name: string
  code?: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export interface MasterSection {
  id: string
  name: string
  department_id: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

const ROLES_KEY = 'ff_master_roles_v1'
const DEPTS_KEY = 'ff_master_depts_v1'
const SECS_KEY = 'ff_master_secs_v1'

// Default seed roles
export function getInitialRoles(): MasterRole[] {
  const roles: Role[] = [
    'requester',
    'approver',
    'approver_manager',
    'approver_pool',
    'admin',
    'admin_lobby',
    'driver',
    'security',
    'coupon',
  ]
  return roles.map((r) => ({
    id: r,
    name: ROLE_LABEL[r] || r,
    description: `Hak akses bawaan untuk ${ROLE_LABEL[r] || r}`,
    is_deleted: false,
  }))
}

// Default seed departments dari matriks organisasi
export function getInitialDepartments(): MasterDepartment[] {
  const deptNames = Array.from(new Set(ORG_MATRIX.map((m) => m.dept)))
  return deptNames.map((name) => ({
    id: `dept_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name,
    code: name,
    is_deleted: false,
  }))
}

// Default seed sections dengan foreign key department_id (disimpan satu per satu)
export function getInitialSections(depts = getInitialDepartments()): MasterSection[] {
  const sections: MasterSection[] = []
  const seen = new Set<string>()

  ORG_MATRIX.forEach((m) => {
    const deptObj = depts.find((d) => d.name.toUpperCase() === m.dept.toUpperCase())
    const deptId = deptObj ? deptObj.id : `dept_${m.dept.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    
    // Pecah jika masih ada koma atau gunakan langsung satu per satu
    const secParts = m.section.split(',').map((s) => s.trim()).filter(Boolean)
    secParts.forEach((secName) => {
      const key = `${deptId}_${secName.toUpperCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        sections.push({
          id: `sec_${Math.random().toString(36).substr(2, 9)}`,
          name: secName,
          department_id: deptId,
          is_deleted: false,
        })
      }
    })
  })

  return sections
}

// ======================== LOCAL STORAGE HELPERS ========================

export function getLocalRoles(includeDeleted = false): MasterRole[] {
  if (typeof window === 'undefined') return getInitialRoles()
  try {
    const raw = window.localStorage.getItem(ROLES_KEY)
    const list: MasterRole[] = raw ? JSON.parse(raw) : getInitialRoles()
    return includeDeleted ? list : list.filter((r) => !r.is_deleted)
  } catch {
    return getInitialRoles()
  }
}

export function saveLocalRoles(roles: MasterRole[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
  window.dispatchEvent(new Event('master_roles_updated'))
}

export function getLocalDepartments(includeDeleted = false): MasterDepartment[] {
  if (typeof window === 'undefined') return getInitialDepartments()
  try {
    const raw = window.localStorage.getItem(DEPTS_KEY)
    const list: MasterDepartment[] = raw ? JSON.parse(raw) : getInitialDepartments()
    return includeDeleted ? list : list.filter((d) => !d.is_deleted)
  } catch {
    return getInitialDepartments()
  }
}

export function saveLocalDepartments(depts: MasterDepartment[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEPTS_KEY, JSON.stringify(depts))
  window.dispatchEvent(new Event('master_depts_updated'))
}

export function getLocalSections(includeDeleted = false): MasterSection[] {
  if (typeof window === 'undefined') return getInitialSections()
  try {
    const raw = window.localStorage.getItem(SECS_KEY)
    const list: MasterSection[] = raw ? JSON.parse(raw) : getInitialSections()
    return includeDeleted ? list : list.filter((s) => !s.is_deleted)
  } catch {
    return getInitialSections()
  }
}

export function saveLocalSections(sections: MasterSection[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SECS_KEY, JSON.stringify(sections))
  window.dispatchEvent(new Event('master_secs_updated'))
}

// ======================== SYNC DENGAN SUPABASE (TABLE departments & sections) ========================

export async function fetchMasterRolesFromSupabase(): Promise<MasterRole[] | null> {
  try {
    const { data, error } = await supabase.from('master_roles').select('*').order('name')
    if (error || !data || data.length === 0) return null
    return data
  } catch {
    return null
  }
}

export async function upsertMasterRoleToSupabase(role: MasterRole): Promise<boolean> {
  try {
    const { error } = await supabase.from('master_roles').upsert({
      id: role.id,
      name: role.name,
      description: role.description || null,
      is_deleted: role.is_deleted,
      updated_at: new Date().toISOString(),
    })
    return !error
  } catch {
    return false
  }
}

export async function fetchMasterDeptsFromSupabase(): Promise<MasterDepartment[] | null> {
  try {
    const { data, error } = await supabase.from('departments').select('id, name, created_at').order('name')
    if (error || !data || data.length === 0) return null
    return data.map((d: any) => ({
      id: String(d.id),
      name: d.name,
      code: d.name,
      is_deleted: false,
      created_at: d.created_at,
    }))
  } catch {
    return null
  }
}

export async function upsertMasterDeptToSupabase(dept: MasterDepartment): Promise<boolean> {
  try {
    const numId = Number(dept.id)
    if (!isNaN(numId) && numId > 0) {
      // Update by numeric ID
      const { error } = await supabase
        .from('departments')
        .update({ name: dept.name })
        .eq('id', numId)
      return !error
    } else {
      // Insert new department (serial ID)
      const { error } = await supabase
        .from('departments')
        .insert({ name: dept.name })
      return !error
    }
  } catch {
    return false
  }
}

export async function deleteMasterDeptFromSupabase(id: string | number): Promise<boolean> {
  try {
    const numId = Number(id)
    if (isNaN(numId)) return false
    const { error } = await supabase.from('departments').delete().eq('id', numId)
    return !error
  } catch {
    return false
  }
}

export async function fetchMasterSectionsFromSupabase(): Promise<MasterSection[] | null> {
  try {
    const { data, error } = await supabase.from('sections').select('id, name, department_id, created_at').order('name')
    if (error || !data || data.length === 0) return null
    return data.map((s: any) => ({
      id: String(s.id),
      name: s.name,
      department_id: String(s.department_id),
      is_deleted: false,
      created_at: s.created_at,
    }))
  } catch {
    return null
  }
}

export async function upsertMasterSectionToSupabase(section: MasterSection): Promise<boolean> {
  try {
    const numId = Number(section.id)
    let numDeptId = Number(section.department_id)

    // Jika department_id string non-angka (misal dept_produksi), cari ID integer di tabel departments atau localStorage
    if (isNaN(numDeptId)) {
      const depts = getLocalDepartments()
      const found = depts.find((d) => d.id === section.department_id || d.name.toUpperCase() === section.department_id.toUpperCase())
      if (found && !isNaN(Number(found.id))) {
        numDeptId = Number(found.id)
      } else {
        // Fallback cari di database langsung
        const { data: deptRows } = await supabase.from('departments').select('id, name')
        if (deptRows) {
          const matched = deptRows.find((d: any) => 
            d.name.toUpperCase() === section.department_id.toUpperCase() ||
            `dept_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` === section.department_id
          )
          if (matched) numDeptId = matched.id
        }
      }
    }

    if (isNaN(numDeptId)) {
      console.warn('Cannot resolve numeric department_id for section:', section)
      return false
    }

    if (!isNaN(numId) && numId > 0) {
      // Update by existing numeric ID
      const { error } = await supabase
        .from('sections')
        .update({
          name: section.name,
          department_id: numDeptId,
        })
        .eq('id', numId)
      return !error
    } else {
      // Insert new section
      const { data, error } = await supabase
        .from('sections')
        .insert({
          name: section.name,
          department_id: numDeptId,
        })
        .select()
        .single()
      if (!error && data) {
        section.id = String(data.id)
        section.department_id = String(data.department_id)
      }
      return !error
    }
  } catch {
    return false
  }
}

export async function deleteMasterSectionFromSupabase(id: string | number): Promise<boolean> {
  try {
    const numId = Number(id)
    if (isNaN(numId)) return false
    const { error } = await supabase.from('sections').delete().eq('id', numId)
    return !error
  } catch {
    return false
  }
}
