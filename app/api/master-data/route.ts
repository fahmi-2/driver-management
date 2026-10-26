import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Ambil master roles, departments, dan sections
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'roles' | 'departments' | 'sections' | 'all'
    const includeDeleted = searchParams.get('include_deleted') === 'true'

    if (type === 'roles') {
      let q = supabase.from('master_roles').select('*').order('name')
      if (!includeDeleted) q = q.eq('is_deleted', false)
      const { data, error } = await q
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (type === 'departments') {
      let q = supabase.from('master_departments').select('*').order('name')
      if (!includeDeleted) q = q.eq('is_deleted', false)
      const { data, error } = await q
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (type === 'sections') {
      let q = supabase.from('master_sections').select('*, master_departments(name)').order('name')
      if (!includeDeleted) q = q.eq('is_deleted', false)
      const { data, error } = await q
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    // Default: Ambil ketiga entitas
    const [rolesRes, deptsRes, secsRes] = await Promise.all([
      includeDeleted
        ? supabase.from('master_roles').select('*').order('name')
        : supabase.from('master_roles').select('*').eq('is_deleted', false).order('name'),
      includeDeleted
        ? supabase.from('master_departments').select('*').order('name')
        : supabase.from('master_departments').select('*').eq('is_deleted', false).order('name'),
      includeDeleted
        ? supabase.from('master_sections').select('*').order('name')
        : supabase.from('master_sections').select('*').eq('is_deleted', false).order('name'),
    ])

    return NextResponse.json({
      success: true,
      roles: rolesRes.data || [],
      departments: deptsRes.data || [],
      sections: secsRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Tambah (Create) Role, Department, atau Section baru
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { entity, data } = body // entity: 'role' | 'department' | 'section'

    if (!entity || !data) {
      return NextResponse.json({ success: false, error: 'Entity dan data wajib disertakan' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (entity === 'role') {
      const id = data.id || `role_${Date.now()}`
      const { data: inserted, error } = await supabase
        .from('master_roles')
        .insert({
          id,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data: inserted })
    }

    if (entity === 'department') {
      const id = data.id || `dept_${Date.now()}`
      const { data: inserted, error } = await supabase
        .from('master_departments')
        .insert({
          id,
          name: data.name.trim(),
          code: data.code?.trim() || data.name.trim().toUpperCase(),
          is_deleted: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data: inserted })
    }

    if (entity === 'section') {
      if (!data.department_id) {
        return NextResponse.json({ success: false, error: 'Wajib memilih Departemen (department_id)' }, { status: 400 })
      }
      const id = data.id || `sec_${Date.now()}`
      const { data: inserted, error } = await supabase
        .from('master_sections')
        .insert({
          id,
          name: data.name.trim(),
          department_id: data.department_id,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data: inserted })
    }

    return NextResponse.json({ success: false, error: 'Entity tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PUT: Rename / Update / Move (Reassign Section)
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { entity, id, updates } = body

    if (!entity || !id || !updates) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (entity === 'role') {
      const payload: any = { updated_at: now }
      if (updates.name !== undefined) payload.name = updates.name.trim()
      if (updates.description !== undefined) payload.description = updates.description.trim()

      const { data, error } = await supabase.from('master_roles').update(payload).eq('id', id).select().single()
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data })
    }

    if (entity === 'department') {
      const payload: any = { updated_at: now }
      if (updates.name !== undefined) payload.name = updates.name.trim()
      if (updates.code !== undefined) payload.code = updates.code.trim()

      const { data, error } = await supabase.from('master_departments').update(payload).eq('id', id).select().single()
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data })
    }

    if (entity === 'section') {
      const payload: any = { updated_at: now }
      if (updates.name !== undefined) payload.name = updates.name.trim()
      // Move / Reassign: update department_id Foreign Key
      if (updates.department_id !== undefined) payload.department_id = updates.department_id

      const { data, error } = await supabase.from('master_sections').update(payload).eq('id', id).select().single()
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: 'Entity tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Soft Delete (is_deleted = true) dengan validasi safety logic
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity') // 'role' | 'department' | 'section'
    const id = searchParams.get('id')
    const cascadeSections = searchParams.get('cascade_sections') === 'true' // opsi ikutan nonaktifkan sections di bawah dept

    if (!entity || !id) {
      return NextResponse.json({ success: false, error: 'Entity dan ID wajib disertakan' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (entity === 'role') {
      const { error } = await supabase.from('master_roles').update({ is_deleted: true, updated_at: now }).eq('id', id)
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, message: `Role ${id} dinonaktifkan (Soft Delete)` })
    }

    if (entity === 'department') {
      // Cek apakah ada sections aktif di bawah departemen ini
      const { data: activeSections } = await supabase
        .from('master_sections')
        .select('id, name')
        .eq('department_id', id)
        .eq('is_deleted', false)

      if (activeSections && activeSections.length > 0 && !cascadeSections) {
        return NextResponse.json(
          {
            success: false,
            hasActiveChildren: true,
            activeCount: activeSections.length,
            message: `Departemen ini masih memiliki ${activeSections.length} Section aktif. Mohon pindahkan Section terlebih dahulu atau konfirmasi untuk ikut menonaktifkannya.`,
          },
          { status: 409 }
        )
      }

      // Soft delete departemen
      const { error } = await supabase
        .from('master_departments')
        .update({ is_deleted: true, updated_at: now })
        .eq('id', id)

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

      // Jika cascadeSections aktif, soft delete juga sections di bawahnya
      if (cascadeSections) {
        await supabase
          .from('master_sections')
          .update({ is_deleted: true, updated_at: now })
          .eq('department_id', id)
      }

      return NextResponse.json({ success: true, message: `Departemen ${id} berhasil dinonaktifkan (Soft Delete)` })
    }

    if (entity === 'section') {
      const { error } = await supabase
        .from('master_sections')
        .update({ is_deleted: true, updated_at: now })
        .eq('id', id)

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, message: `Section ${id} dinonaktifkan (Soft Delete)` })
    }

    return NextResponse.json({ success: false, error: 'Entity tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
