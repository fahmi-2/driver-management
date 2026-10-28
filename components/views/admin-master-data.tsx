'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  FolderTree,
  Shield,
  Layers,
  Building2,
  Plus,
  Edit3,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  RefreshCw,
  FolderPlus,
  GitBranch,
  ShieldAlert,
  HelpCircle
} from 'lucide-react'
import {
  type MasterRole,
  type MasterDepartment,
  type MasterSection,
  getLocalRoles,
  saveLocalRoles,
  getLocalDepartments,
  saveLocalDepartments,
  getLocalSections,
  saveLocalSections,
  fetchMasterRolesFromSupabase,
  fetchMasterDeptsFromSupabase,
  fetchMasterSectionsFromSupabase,
  upsertMasterRoleToSupabase,
  upsertMasterDeptToSupabase,
  upsertMasterSectionToSupabase,
} from '@/lib/master-data'
import { Card, PageHeader, Pill, useToast, btnPrimary, btnGhost } from '../ui-bits'
import { ModalPortal } from '../modal-portal'

export function AdminMasterDataView() {
  const notify = useToast()

  // State Data
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'roles'>('hierarchy')
  const [roles, setRoles] = useState<MasterRole[]>([])
  const [departments, setDepartments] = useState<MasterDepartment[]>([])
  const [sections, setSections] = useState<MasterSection[]>([])
  const [search, setSearch] = useState('')
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  // Modal State
  const [modalType, setModalType] = useState<
    | null
    | 'ADD_ROLE'
    | 'EDIT_ROLE'
    | 'ADD_DEPT'
    | 'EDIT_DEPT'
    | 'ADD_SEC'
    | 'EDIT_SEC'
    | 'MOVE_SEC'
    | 'DELETE_CONFIRM'
  >(null)

  // Current selected item for action
  const [selectedRole, setSelectedRole] = useState<MasterRole | null>(null)
  const [selectedDept, setSelectedDept] = useState<MasterDepartment | null>(null)
  const [selectedSec, setSelectedSec] = useState<MasterSection | null>(null)

  // Form Inputs
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTargetDeptId, setFormTargetDeptId] = useState('')
  const [cascadeDeleteSections, setCascadeDeleteSections] = useState(false)

  // Load Initial Data
  const loadData = () => {
    const r = getLocalRoles()
    const d = getLocalDepartments()
    const s = getLocalSections()
    setRoles(r)
    setDepartments(d)
    setSections(s)

    // Expand all departments by default
    const exp: Record<string, boolean> = {}
    d.forEach((dept) => {
      exp[dept.id] = true
    })
    setExpandedDepts(exp)
  }

  useEffect(() => {
    loadData()

    // Sync dari Supabase jika ada
    const syncFromRemote = async () => {
      setLoading(true)
      try {
        const [remRoles, remDepts, remSecs] = await Promise.all([
          fetchMasterRolesFromSupabase(),
          fetchMasterDeptsFromSupabase(),
          fetchMasterSectionsFromSupabase(),
        ])
        if (remRoles && remRoles.length > 0) {
          setRoles(remRoles.filter((x) => !x.is_deleted))
          saveLocalRoles(remRoles)
        }
        if (remDepts && remDepts.length > 0) {
          setDepartments(remDepts.filter((x) => !x.is_deleted))
          saveLocalDepartments(remDepts)
        }
        if (remSecs && remSecs.length > 0) {
          setSections(remSecs.filter((x) => !x.is_deleted))
          saveLocalSections(remSecs)
        }
      } catch (err) {
        console.warn('Sync master data remote warning:', err)
      } finally {
        setLoading(false)
      }
    }

    syncFromRemote()

    const onDeptsUpdated = () => setDepartments(getLocalDepartments())
    const onSecsUpdated = () => setSections(getLocalSections())
    const onRolesUpdated = () => setRoles(getLocalRoles())

    window.addEventListener('master_depts_updated', onDeptsUpdated)
    window.addEventListener('master_secs_updated', onSecsUpdated)
    window.addEventListener('master_roles_updated', onRolesUpdated)

    return () => {
      window.removeEventListener('master_depts_updated', onDeptsUpdated)
      window.removeEventListener('master_secs_updated', onSecsUpdated)
      window.removeEventListener('master_roles_updated', onRolesUpdated)
    }
  }, [])

  // Toggle tree view expand/collapse
  const toggleDeptExpand = (deptId: string) => {
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }))
  }

  // Expand All / Collapse All
  const expandAll = () => {
    const exp: Record<string, boolean> = {}
    departments.forEach((d) => (exp[d.id] = true))
    setExpandedDepts(exp)
  }
  const collapseAll = () => setExpandedDepts({})

  // Filtered Hierarchy
  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return departments
    const q = search.toLowerCase()
    return departments.filter((d) => {
      const matchDept = d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q))
      const hasMatchingSec = sections.some(
        (s) => s.department_id === d.id && s.name.toLowerCase().includes(q)
      )
      return matchDept || hasMatchingSec
    })
  }, [departments, sections, search])

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles
    const q = search.toLowerCase()
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
    )
  }, [roles, search])

  // ======================== ACTIONS & CRUD HANDLERS ========================

  // 1. ADD / EDIT ROLE
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      notify('Nama peran (Role) wajib diisi', 'error')
      return
    }

    if (modalType === 'ADD_ROLE') {
      const rawId = formCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || `role_${Date.now()}`
      if (roles.some((r) => r.id === rawId)) {
        notify(`ID Role '${rawId}' sudah ada! Gunakan kode lain.`, 'error')
        return
      }
      const newRole: MasterRole = {
        id: rawId,
        name: formName.trim(),
        description: formDescription.trim(),
        is_deleted: false,
        created_at: new Date().toISOString(),
      }
      const next = [...roles, newRole]
      setRoles(next)
      saveLocalRoles(next)
      upsertMasterRoleToSupabase(newRole)
      notify(`Role baru '${newRole.name}' berhasil ditambahkan!`)
    } else if (modalType === 'EDIT_ROLE' && selectedRole) {
      const updated: MasterRole = {
        ...selectedRole,
        name: formName.trim(),
        description: formDescription.trim(),
        updated_at: new Date().toISOString(),
      }
      const next = roles.map((r) => (r.id === selectedRole.id ? updated : r))
      setRoles(next)
      saveLocalRoles(next)
      upsertMasterRoleToSupabase(updated)
      notify(`Role '${updated.name}' berhasil diperbarui!`)
    }

    closeModal()
  }

  // 2. ADD / EDIT DEPARTMENT
  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      notify('Nama Departemen wajib diisi', 'error')
      return
    }

    if (modalType === 'ADD_DEPT') {
      const rawId = `dept_${Date.now()}`
      const newDept: MasterDepartment = {
        id: rawId,
        name: formName.trim().toUpperCase(),
        code: formCode.trim().toUpperCase() || formName.trim().toUpperCase(),
        is_deleted: false,
        created_at: new Date().toISOString(),
      }
      const next = [...departments, newDept]
      setDepartments(next)
      saveLocalDepartments(next)
      setExpandedDepts((prev) => ({ ...prev, [newDept.id]: true }))
      upsertMasterDeptToSupabase(newDept)
      notify(`Departemen '${newDept.name}' berhasil ditambahkan!`)
    } else if (modalType === 'EDIT_DEPT' && selectedDept) {
      const updated: MasterDepartment = {
        ...selectedDept,
        name: formName.trim().toUpperCase(),
        code: formCode.trim().toUpperCase() || formName.trim().toUpperCase(),
        updated_at: new Date().toISOString(),
      }
      const next = departments.map((d) => (d.id === selectedDept.id ? updated : d))
      setDepartments(next)
      saveLocalDepartments(next)
      upsertMasterDeptToSupabase(updated)
      notify(`Departemen '${updated.name}' berhasil di-rename! User terhubung tetap aman menggunakan ID.`)
    }

    closeModal()
  }

  // 3. ADD / EDIT SECTION
  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      notify('Nama Section (Bagian) wajib diisi', 'error')
      return
    }
    if (!formTargetDeptId) {
      notify('Wajib memilih Departemen induk!', 'error')
      return
    }

    if (modalType === 'ADD_SEC') {
      const rawId = `sec_${Date.now()}`
      const newSec: MasterSection = {
        id: rawId,
        name: formName.trim(),
        department_id: formTargetDeptId,
        is_deleted: false,
        created_at: new Date().toISOString(),
      }
      const next = [...sections, newSec]
      setSections(next)
      saveLocalSections(next)
      setExpandedDepts((prev) => ({ ...prev, [formTargetDeptId]: true }))
      upsertMasterSectionToSupabase(newSec)
      notify(`Section '${newSec.name}' berhasil ditambahkan ke Departemen!`)
    } else if (modalType === 'EDIT_SEC' && selectedSec) {
      const updated: MasterSection = {
        ...selectedSec,
        name: formName.trim(),
        updated_at: new Date().toISOString(),
      }
      const next = sections.map((s) => (s.id === selectedSec.id ? updated : s))
      setSections(next)
      saveLocalSections(next)
      upsertMasterSectionToSupabase(updated)
      notify(`Section '${updated.name}' berhasil diperbarui!`)
    }

    closeModal()
  }

  // 4. MOVE / REASSIGN SECTION KE DEPARTEMEN LAIN
  const handleMoveSection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSec || !formTargetDeptId) return

    if (selectedSec.department_id === formTargetDeptId) {
      notify('Departemen tujuan sama dengan departemen saat ini.', 'error')
      return
    }

    const targetDept = departments.find((d) => d.id === formTargetDeptId)
    const updated: MasterSection = {
      ...selectedSec,
      department_id: formTargetDeptId,
      updated_at: new Date().toISOString(),
    }

    const next = sections.map((s) => (s.id === selectedSec.id ? updated : s))
    setSections(next)
    saveLocalSections(next)
    setExpandedDepts((prev) => ({ ...prev, [formTargetDeptId]: true }))
    upsertMasterSectionToSupabase(updated)

    notify(`Sukses memindahkan Section '${selectedSec.name}' ke Departemen '${targetDept?.name || formTargetDeptId}'!`)
    closeModal()
  }

  // 5. SOFT DELETE HANDLER (SAFETY LOGIC)
  const handleConfirmSoftDelete = () => {
    const nowIso = new Date().toISOString()

    if (selectedRole) {
      const next = roles.map((r) => (r.id === selectedRole.id ? { ...r, is_deleted: true, updated_at: nowIso } : r))
      setRoles(next.filter((r) => !r.is_deleted))
      saveLocalRoles(next)
      upsertMasterRoleToSupabase({ ...selectedRole, is_deleted: true, updated_at: nowIso })
      notify(`Role '${selectedRole.name}' berhasil dinonaktifkan (Soft Delete).`)
    } else if (selectedDept) {
      // Cek apakah ada sections di bawah departemen ini
      const childSections = sections.filter((s) => s.department_id === selectedDept.id && !s.is_deleted)
      if (childSections.length > 0 && !cascadeDeleteSections) {
        notify(
          `Peringatan: Departemen '${selectedDept.name}' memiliki ${childSections.length} Section aktif! Pindahkan section atau centang opsi nonaktifkan bersama.`,
          'error',
          6000
        )
        return
      }

      // Soft delete Departemen
      const nextDepts = departments.map((d) =>
        d.id === selectedDept.id ? { ...d, is_deleted: true, updated_at: nowIso } : d
      )
      setDepartments(nextDepts.filter((d) => !d.is_deleted))
      saveLocalDepartments(nextDepts)
      upsertMasterDeptToSupabase({ ...selectedDept, is_deleted: true, updated_at: nowIso })

      // Cascade soft delete sections jika dicentang
      if (cascadeDeleteSections) {
        const nextSecs = sections.map((s) =>
          s.department_id === selectedDept.id ? { ...s, is_deleted: true, updated_at: nowIso } : s
        )
        setSections(nextSecs.filter((s) => !s.is_deleted))
        saveLocalSections(nextSecs)
        childSections.forEach((s) => {
          upsertMasterSectionToSupabase({ ...s, is_deleted: true, updated_at: nowIso })
        })
      }

      notify(`Departemen '${selectedDept.name}' berhasil dinonaktifkan (Soft Delete).`)
    } else if (selectedSec) {
      const next = sections.map((s) => (s.id === selectedSec.id ? { ...s, is_deleted: true, updated_at: nowIso } : s))
      setSections(next.filter((s) => !s.is_deleted))
      saveLocalSections(next)
      upsertMasterSectionToSupabase({ ...selectedSec, is_deleted: true, updated_at: nowIso })
      notify(`Section '${selectedSec.name}' berhasil dinonaktifkan (Soft Delete).`)
    }

    closeModal()
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedRole(null)
    setSelectedDept(null)
    setSelectedSec(null)
    setFormName('')
    setFormCode('')
    setFormDescription('')
    setFormTargetDeptId('')
    setCascadeDeleteSections(false)
  }

  // Open modals helper
  const openAddRole = () => {
    setFormName('')
    setFormCode('')
    setFormDescription('')
    setModalType('ADD_ROLE')
  }

  const openEditRole = (role: MasterRole) => {
    setSelectedRole(role)
    setFormName(role.name)
    setFormCode(role.id)
    setFormDescription(role.description || '')
    setModalType('EDIT_ROLE')
  }

  const openAddDept = () => {
    setFormName('')
    setFormCode('')
    setModalType('ADD_DEPT')
  }

  const openEditDept = (dept: MasterDepartment) => {
    setSelectedDept(dept)
    setFormName(dept.name)
    setFormCode(dept.code || dept.name)
    setModalType('EDIT_DEPT')
  }

  const openAddSection = (deptId?: string) => {
    setFormName('')
    setFormTargetDeptId(deptId || departments[0]?.id || '')
    setModalType('ADD_SEC')
  }

  const openEditSection = (sec: MasterSection) => {
    setSelectedSec(sec)
    setFormName(sec.name)
    setFormTargetDeptId(sec.department_id)
    setModalType('EDIT_SEC')
  }

  const openMoveSection = (sec: MasterSection) => {
    setSelectedSec(sec)
    setFormTargetDeptId(sec.department_id)
    setModalType('MOVE_SEC')
  }

  const openDeleteModal = (item: { role?: MasterRole; dept?: MasterDepartment; sec?: MasterSection }) => {
    setSelectedRole(item.role || null)
    setSelectedDept(item.dept || null)
    setSelectedSec(item.sec || null)
    setCascadeDeleteSections(false)
    setModalType('DELETE_CONFIRM')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Kelola Master Data Organisasi"
        desc="Atur hierarki dinamis Departemen, Section (Bagian), dan Hak Akses Peran (Role)"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadData()
                notify('Data master diperbarui dari sistem.')
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>

            {activeTab === 'hierarchy' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={openAddDept}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition"
                >
                  <Plus size={14} />
                  Tambah Departemen
                </button>
                <button
                  onClick={() => openAddSection()}
                  className="flex items-center gap-1.5 rounded-xl bg-lime-500 hover:bg-lime-400 px-3.5 py-2 text-xs font-bold text-black shadow-md shadow-lime-950/40 transition"
                >
                  <FolderPlus size={14} />
                  Tambah Section
                </button>
              </div>
            ) : (
              <button
                onClick={openAddRole}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-950/40 transition"
              >
                <Plus size={14} />
                Tambah Role Baru
              </button>
            )}
          </div>
        }
      />

      {/* Tabs Navigasi: Hierarki (Dept & Section) vs Peran (Roles) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'hierarchy'
                ? 'bg-[#a3e635] text-[#052e16] shadow-sm'
                : 'bg-white/5 text-[#8fa99b] hover:bg-white/10 hover:text-white'
            }`}
          >
            <FolderTree size={16} />
            Struktur Hierarki: Departemen &amp; Section
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-mono">
              {departments.length} Divisi / {sections.length} Bagian
            </span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'roles'
                ? 'bg-[#a3e635] text-[#052e16] shadow-sm'
                : 'bg-white/5 text-[#8fa99b] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Shield size={16} />
            Master Hak Akses: Peran (Role)
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-mono">
              {roles.length} Role
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa99b]" />
          <input
            type="text"
            placeholder={activeTab === 'hierarchy' ? 'Cari departemen / section…' : 'Cari nama peran role…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl bg-black/40 border border-white/10 pl-8 pr-3 text-xs text-white placeholder:text-[#8fa99b]/60 focus:border-[#a3e635] focus:outline-none"
          />
        </div>
      </div>

      {/* KONTEN TAB 1: STRUKTUR HIERARKI DEPARTEMEN & SECTION (TREE VIEW / NESTED TABLE) */}
      {activeTab === 'hierarchy' && (
        <Card
          title="Tree View: Struktur Organisasi Perusahaan"
          subtitle="Entitas induk Departemen memiliki relasi One-to-Many ke Section (Bagian). Data user terhubung via ID unik."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-[11px] font-semibold text-[#8fa99b] hover:text-[#a3e635] transition"
              >
                Buka Semua
              </button>
              <span className="text-white/20">•</span>
              <button
                onClick={collapseAll}
                className="text-[11px] font-semibold text-[#8fa99b] hover:text-[#a3e635] transition"
              >
                Tutup Semua
              </button>
            </div>
          }
        >
          {filteredDepartments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8fa99b]">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-[#8fa99b]/40" />
              <p className="font-semibold text-white">Tidak ada departemen yang cocok.</p>
              <p className="mt-1">Gunakan tombol "Tambah Departemen" di atas untuk menambahkan data baru.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredDepartments.map((dept) => {
                const isExpanded = !!expandedDepts[dept.id]
                const childSections = sections.filter((s) => s.department_id === dept.id)

                return (
                  <div key={dept.id} className="transition-all hover:bg-white/[0.01]">
                    {/* Departemen Row (Parent) */}
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDeptExpand(dept.id)}
                          className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Building2 size={16} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm tracking-wide">{dept.name}</span>
                            <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                              ID: {dept.id}
                            </span>
                            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-[#8fa99b]">
                              {childSections.length} Section Terhubung
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Parent Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAddSection(dept.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] font-semibold text-lime-300 hover:bg-lime-400/20 transition"
                          title="Tambah Section di Departemen ini"
                        >
                          <Plus size={12} />
                          Section
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditDept(dept)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#8fa99b] hover:text-white hover:bg-white/10 transition"
                          title="Rename / Ubah Nama Departemen"
                        >
                          <Edit3 size={12} />
                          Rename
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal({ dept })}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                          title="Hapus Departemen (Soft Delete)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Child Sections (Nested Tree) */}
                    {isExpanded && (
                      <div className="pl-12 pr-4 pb-4 pt-1 bg-black/20">
                        {childSections.length === 0 ? (
                          <div className="py-3 px-4 text-[11px] text-[#8fa99b]/70 border-l-2 border-emerald-500/30 italic">
                            Belum ada section/bagian di bawah departemen ini.{' '}
                            <button
                              onClick={() => openAddSection(dept.id)}
                              className="text-lime-400 underline hover:text-lime-300 font-medium not-italic"
                            >
                              Tambah section sekarang
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5 border-l-2 border-emerald-500/30 pl-3">
                            {childSections.map((sec) => (
                              <div
                                key={sec.id}
                                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs hover:border-white/10 transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <GitBranch size={13} className="text-[#8fa99b]" />
                                  <span className="font-semibold text-white">{sec.name}</span>
                                  <span className="font-mono text-[9px] text-[#8fa99b] bg-white/5 px-1.5 py-0.5 rounded">
                                    {sec.id}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* MOVE / REASSIGN SECTION BUTTON */}
                                  <button
                                    type="button"
                                    onClick={() => openMoveSection(sec)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
                                    title="Pindahkan Section ini ke Departemen Lain (Reassign Foreign Key)"
                                  >
                                    <ArrowRightLeft size={11} />
                                    Pindah Divisi
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditSection(sec)}
                                    className="p-1 rounded-lg text-[#8fa99b] hover:text-white hover:bg-white/10 transition"
                                    title="Rename Section"
                                  >
                                    <Edit3 size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal({ sec })}
                                    className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                                    title="Hapus Section (Soft Delete)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* KONTEN TAB 2: MASTER ROLES (HAK AKSES PERAN) */}
      {activeTab === 'roles' && (
        <Card
          title="Master Peran (Roles) & Otoritas Sistem"
          subtitle="Entitas peran berdiri sendiri untuk menentukan izin akses menu dan tugas pengguna di sistem."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-[#8fa99b]">
                  <th className="py-3 px-4">Kode ID Role</th>
                  <th className="py-3 px-4">Nama Peran Resmi</th>
                  <th className="py-3 px-4">Deskripsi / Wewenang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">
                      <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5">
                        {role.id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {role.name}
                    </td>
                    <td className="py-3 px-4 text-[#8fa99b]">
                      {role.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditRole(role)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#8fa99b] hover:text-white hover:bg-white/10 transition"
                          title="Rename / Ubah Peran"
                        >
                          <Edit3 size={12} />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal({ role })}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                          title="Hapus Role (Soft Delete)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ======================== POPUP MODALS ======================== */}

      {/* MODAL 1: TAMBAH / EDIT ROLE */}
      {(modalType === 'ADD_ROLE' || modalType === 'EDIT_ROLE') && (
        <ModalPortal onClose={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] text-white shadow-2xl border border-purple-500/30 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-purple-950/40 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {modalType === 'ADD_ROLE' ? 'Tambah Peran (Role) Baru' : 'Edit Peran (Role)'}
                  </h3>
                  <p className="text-[11px] text-[#8fa99b]">Hak akses otentikasi akun</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg text-[#8fa99b] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              {modalType === 'ADD_ROLE' && (
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Kode ID Role (Unik) <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="misal: auditor / staff_finance"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-purple-400"
                    required
                  />
                  <p className="text-[10px] text-[#8fa99b] mt-1">Digunakan sebagai identifier kunci di sistem.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Nama Label Peran <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="misal: Staff Finance / Internal Auditor"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">Deskripsi Wewenang</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan singkat hak akses peran ini…"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white shadow-md transition"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: TAMBAH / EDIT DEPARTEMEN */}
      {(modalType === 'ADD_DEPT' || modalType === 'EDIT_DEPT') && (
        <ModalPortal onClose={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] text-white shadow-2xl border border-emerald-500/30 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-emerald-950/40 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {modalType === 'ADD_DEPT' ? 'Tambah Departemen (Divisi) Baru' : 'Rename / Edit Departemen'}
                  </h3>
                  <p className="text-[11px] text-[#8fa99b]">Entitas induk organisasi</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg text-[#8fa99b] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Nama Departemen <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="misal: PGA / PRODUCTION / MAINTENANCE"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">Kode Singkatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="misal: PGA / MTC"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-400"
                />
              </div>

              {modalType === 'EDIT_DEPT' && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-[11px] text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                  <p>
                    Relasi sistem terhubung ke ID (<strong>{selectedDept?.id}</strong>). Mengubah nama departemen tidak akan merusak riwayat perjalanan maupun akun user terkait.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-bold text-xs text-white shadow-md transition"
                >
                  Simpan Departemen
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 3: TAMBAH / EDIT SECTION */}
      {(modalType === 'ADD_SEC' || modalType === 'EDIT_SEC') && (
        <ModalPortal onClose={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] text-white shadow-2xl border border-lime-500/30 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-lime-950/40 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-lime-400/20 text-lime-300 border border-lime-400/40">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {modalType === 'ADD_SEC' ? 'Tambah Section (Bagian) Baru' : 'Edit Section'}
                  </h3>
                  <p className="text-[11px] text-[#8fa99b]">Entitas anak di bawah Departemen</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg text-[#8fa99b] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Pilih Departemen Induk <span className="text-lime-400">*Wajib</span>
                </label>
                <select
                  value={formTargetDeptId}
                  onChange={(e) => setFormTargetDeptId(e.target.value)}
                  disabled={modalType === 'EDIT_SEC'}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-lime-400 disabled:opacity-60"
                  required
                >
                  <option value="" disabled>
                    -- Pilih Departemen --
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
                {modalType === 'EDIT_SEC' && (
                  <p className="text-[10px] text-[#8fa99b] mt-1">
                    Untuk memindahkan ke departemen lain, gunakan tombol aksi <strong>Pindah Divisi</strong>.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Nama Section (Bagian) <span className="text-lime-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="misal: GAGS, STATIONARY & UTILITY / MAINTENANCE"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-lime-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 font-bold text-xs text-black shadow-md transition"
                >
                  Simpan Section
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 4: PINDAHKAN (MOVE / REASSIGN) SECTION KE DEPARTEMEN LAIN */}
      {modalType === 'MOVE_SEC' && selectedSec && (
        <ModalPortal onClose={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] text-white shadow-2xl border border-amber-500/30 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-amber-950/40 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pindah Departemen (Reassign)</h3>
                  <p className="text-[11px] text-[#8fa99b]">Perbarui relasi Foreign Key departemen</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg text-[#8fa99b] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleMoveSection} className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <GitBranch size={14} /> Section Dipindahkan:
                </p>
                <p className="text-sm font-bold text-white">{selectedSec.name}</p>
                <p className="text-[10px] text-[#8fa99b]">
                  Departemen Saat Ini:{' '}
                  <strong className="text-white">
                    {departments.find((d) => d.id === selectedSec.department_id)?.name || selectedSec.department_id}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Pilih Departemen Baru (Tujuan) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={formTargetDeptId}
                  onChange={(e) => setFormTargetDeptId(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} disabled={d.id === selectedSec.department_id}>
                      {d.name} {d.id === selectedSec.department_id ? '(Departemen Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-black shadow-md transition"
                >
                  Konfirmasi Pemindahan
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 5: KONFIRMASI SOFT DELETE & SAFETY LOGIC */}
      {modalType === 'DELETE_CONFIRM' && (
        <ModalPortal onClose={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#140b0f] text-white shadow-2xl border border-rose-500/40 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-rose-950/40 px-6 py-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white">Konfirmasi Penonaktifan (Soft Delete)</h3>
                  <p className="text-[11px] text-rose-300/80">Safety Logic &amp; Integritas Data</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg text-[#8fa99b] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#8fa99b] leading-relaxed">
                Anda akan menonaktifkan:{' '}
                <strong className="text-white">
                  {selectedRole?.name || selectedDept?.name || selectedSec?.name}
                </strong>
                .
              </p>

              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 space-y-1.5 text-rose-200">
                <p className="font-bold flex items-center gap-1.5 text-rose-300">
                  <ShieldAlert size={14} /> Aturan Keamanan Database:
                </p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  Data <strong>TIDAK dihapus permanen</strong> melainkan diberi tanda <code>is_deleted = true</code>. Seluruh riwayat perjalanan dinas dan akun di masa lalu tetap aman dan tidak error.
                </p>
              </div>

              {/* Edge Case: Jika Departemen memiliki Section anak aktif */}
              {selectedDept && (
                (() => {
                  const activeChildCount = sections.filter((s) => s.department_id === selectedDept.id && !s.is_deleted).length
                  if (activeChildCount > 0) {
                    return (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 space-y-2 text-amber-200">
                        <p className="font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Perhatian Khusus:
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          Departemen ini masih memiliki <strong>{activeChildCount} Section aktif</strong> di bawahnya.
                        </p>
                        <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer pt-1 border-t border-amber-500/20">
                          <input
                            type="checkbox"
                            checked={cascadeDeleteSections}
                            onChange={(e) => setCascadeDeleteSections(e.target.checked)}
                            className="h-4 w-4 rounded border-amber-400 text-amber-500 focus:ring-amber-400"
                          />
                          <span>Ikut nonaktifkan seluruh {activeChildCount} Section di bawah departemen ini</span>
                        </label>
                      </div>
                    )
                  }
                  return null
                })()
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSoftDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white shadow-md transition"
                >
                  Ya, Nonaktifkan
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
