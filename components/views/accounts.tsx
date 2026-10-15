'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  UserCheck,
  AlertCircle,
  X,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  type Account,
  type Role,
  ROLE_LABEL,
  DEPARTMENTS,
  getSectionsByDept,
  getAllAccounts,
  resetToDefaultAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  verifyAdminPassword,
} from '@/lib/accounts'
import { useStore } from '@/lib/store'
import { Card, PageHeader, Pill, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'

export function AdminAccounts({ currentUser }: { currentUser: Account }) {
  const notify = useToast()
  const { db } = useStore()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Password Reveal States (Verifikasi Password Admin)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [verifyModalTarget, setVerifyModalTarget] = useState<Account | null>(null)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [verifyError, setVerifyError] = useState('')

  // Add / Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState<{
    username: string
    password: string
    name: string
    role: Role
    dept: string
    section: string
    nik: string
    title: string
    driverId: string
  }>({
    username: '',
    password: '',
    name: '',
    role: 'requester',
    dept: 'PGA',
    section: getSectionsByDept('PGA')[0] || '',
    nik: '',
    title: '',
    driverId: '',
  })
  const [formShowPassword, setFormShowPassword] = useState(false)

  // Load accounts
  const refreshAccounts = () => {
    setAccounts(getAllAccounts())
  }

  useEffect(() => {
    refreshAccounts()
    const handleUpdate = () => refreshAccounts()
    window.addEventListener('accounts_updated', handleUpdate)
    window.addEventListener('profile_updated', handleUpdate)
    return () => {
      window.removeEventListener('accounts_updated', handleUpdate)
      window.removeEventListener('profile_updated', handleUpdate)
    }
  }, [])

  // Reset halaman saat filter atau search berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [search, roleFilter])

  // Filtered accounts
  const filteredAccounts = accounts.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch =
      a.username.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.nik && a.nik.toLowerCase().includes(q)) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.dept && a.dept.toLowerCase().includes(q)) ||
      (a.section && a.section.toLowerCase().includes(q))
    const matchRole = roleFilter === 'ALL' || a.role === roleFilter
    return matchSearch && matchRole
  })

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize))
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Open Add Modal
  const openAddModal = () => {
    setEditingAccount(null)
    const defaultDept = DEPARTMENTS[0] || 'PGA'
    const defaultSecs = getSectionsByDept(defaultDept)
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'requester',
      dept: defaultDept,
      section: defaultSecs[0] || '',
      nik: '',
      title: '',
      driverId: '',
    })
    setFormShowPassword(true)
    setFormModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (acc: Account) => {
    setEditingAccount(acc)
    const curDept = acc.dept || DEPARTMENTS[0] || 'PGA'
    const secList = getSectionsByDept(curDept)
    const curSection = acc.section && secList.includes(acc.section) ? acc.section : secList[0] || ''
    setFormData({
      username: acc.username,
      password: acc.password,
      name: acc.name,
      role: acc.role,
      dept: curDept,
      section: curSection,
      nik: acc.nik || '',
      title: acc.title || '',
      driverId: acc.driverId || '',
    })
    setFormShowPassword(false)
    setFormModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUsername = formData.username.trim().toLowerCase()
    const cleanPassword = formData.password.trim()
    const cleanName = formData.name.trim()

    if (!cleanUsername || !cleanPassword || !cleanName) {
      alert('Username, Password, dan Nama Lengkap wajib diisi!')
      return
    }

    const isOrgRole = ['requester', 'approver', 'approver_pool'].includes(formData.role)
    if (editingAccount) {
      const res = updateAccount(editingAccount.username, {
        username: cleanUsername,
        password: cleanPassword,
        name: cleanName,
        role: formData.role,
        dept: isOrgRole ? formData.dept : undefined,
        section: isOrgRole ? formData.section || undefined : undefined,
        nik: formData.nik.trim() || undefined,
        title: formData.title.trim() || `${ROLE_LABEL[formData.role]} - ${cleanName}`,
        driverId: formData.role === 'driver' ? formData.driverId || undefined : undefined,
      })
      if (!res.success) {
        alert(res.message)
        return
      }
      notify(`Akun "${cleanUsername}" berhasil diperbarui!`)
    } else {
      const res = addAccount({
        username: cleanUsername,
        password: cleanPassword,
        name: cleanName,
        role: formData.role,
        dept: isOrgRole ? formData.dept : undefined,
        section: isOrgRole ? formData.section || undefined : undefined,
        nik: formData.nik.trim() || undefined,
        title: formData.title.trim() || `${ROLE_LABEL[formData.role]} - ${cleanName}`,
        driverId: formData.role === 'driver' ? formData.driverId || undefined : undefined,
      })
      if (!res.success) {
        alert(res.message)
        return
      }
      notify(`Akun baru "${cleanUsername}" berhasil ditambahkan!`)
    }

    setFormModalOpen(false)
    refreshAccounts()
  }

  // Handle Delete
  const handleDeleteAccount = (username: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun "${username}"? Tindakan ini tidak dapat dibatalkan.`)) {
      const res = deleteAccount(username)
      if (!res.success) {
        alert(res.message)
        return
      }
      notify(`Akun "${username}" berhasil dihapus!`)
      refreshAccounts()
    }
  }

  // Handle Password Reveal Trigger
  const handleTogglePassword = (acc: Account) => {
    // Jika sudah di-reveal, toggle sembunyikan kembali tanpa verifikasi
    if (revealedPasswords[acc.username]) {
      setRevealedPasswords((prev) => ({ ...prev, [acc.username]: false }))
      return
    }

    // Jika belum di-reveal, buka modal verifikasi password admin
    setVerifyModalTarget(acc)
    setAdminPasswordInput('')
    setVerifyError('')
  }

  // Handle Submit Verifikasi Password Admin
  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyModalTarget) return

    if (!adminPasswordInput.trim()) {
      setVerifyError('Masukkan password admin!')
      return
    }

    const isValid = verifyAdminPassword(adminPasswordInput.trim())
    if (!isValid) {
      setVerifyError('Password Admin salah! Akses melihat password ditolak.')
      return
    }

    // Berhasil verifikasi: buka tampilan password akun target
    setRevealedPasswords((prev) => ({
      ...prev,
      [verifyModalTarget.username]: true,
    }))
    notify(`Password untuk akun "${verifyModalTarget.username}" berhasil ditampilkan!`)
    setVerifyModalTarget(null)
    setAdminPasswordInput('')
    setVerifyError('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title="Kelola Data Akun Pengguna"
            desc="Kelola kredensial akun, ID pengguna, peran, dan reset password. Dilengkapi proteksi verifikasi password Admin."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Sinkronkan seluruh data akun kembali ke data matriks resmi PT. JAI? Akun default akan diperbarui.')) {
                const refreshed = resetToDefaultAccounts()
                setAccounts(refreshed)
                notify('Data akun berhasil disinkronkan ke master matriks resmi PT. JAI!')
              }
            }}
            className="flex items-center gap-2 rounded-xl border border-[#b8cfc2] bg-white px-3.5 py-2.5 text-xs font-bold text-[#075b3d] shadow-xs transition hover:bg-[#eef8f3]"
          >
            <ShieldCheck size={16} />
            Muat Ulang Matriks Resmi
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-[#075b3d] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#075b3d]/20 transition hover:bg-[#064e34] active:scale-[0.98]"
          >
            <Plus size={16} />
            Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(['ALL', 'requester', 'approver', 'admin', 'admin_lobby', 'driver', 'security'] as const).map((r) => {
          const count = r === 'ALL' ? accounts.length : accounts.filter((a) => a.role === r).length
          const label = r === 'ALL' ? 'Total Semua' : ROLE_LABEL[r]
          const isSelected = roleFilter === r
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-[#a3e635] bg-[#a3e635]/15 shadow-sm ring-1 ring-[#a3e635]/30'
                  : 'border-white/10 bg-black/20 hover:border-[#a3e635]/40 hover:bg-white/5'
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[#bef264]' : 'text-slate-400'}`}>
                {label}
              </p>
              <p className={`mt-1 text-xl font-extrabold ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                {count}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border border-[#edf1ee] rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-[260px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b9b92]" />
              <input
                type="text"
                placeholder="Cari username, nama lengkap, NIK, jabatan, atau divisi…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] pl-9 pr-3 text-xs text-[#10251c] placeholder:text-[#8b9b92] focus:border-[#075b3d] focus:outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="h-10 rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs font-semibold text-[#10251c] focus:border-[#075b3d] focus:outline-none"
            >
              <option value="ALL">Semua Peran (Role)</option>
              <option value="requester">Requester (Pemohon)</option>
              <option value="approver">Approver SPV Departemen (Tahap 1)</option>
              <option value="approver_pool">Approver SPV Kendaraan (Tahap 2)</option>
              <option value="admin">Super Admin (Pool GA)</option>
              <option value="admin_lobby">Admin Lobby Frontdesk</option>
              <option value="driver">Driver (Sopir)</option>
              <option value="security">Security Gerbang</option>
              <option value="coupon">Admin Kupon</option>
            </select>
          </div>
          <div className="text-[11px] font-semibold text-[#62736b]">
            Menampilkan <span className="font-bold text-[#10251c]">{filteredAccounts.length}</span> dari {accounts.length} akun
          </div>
        </div>
      </Card>

      {/* Table of Accounts */}
      <div className="overflow-hidden rounded-2xl border border-[#edf1ee] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#edf1ee] bg-[#f8faf9] text-[11px] font-bold text-[#62736b]">
                <th className="py-3.5 pl-5 pr-3">User ID (Username)</th>
                <th className="px-3 py-3.5">Nama & Identitas</th>
                <th className="px-3 py-3.5">Peran & Divisi</th>
                <th className="px-3 py-3.5">Password</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#8fa096]">
                    Tidak ada data akun yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const isRevealed = !!revealedPasswords[acc.username]
                  const isCurrentAdmin = acc.username === currentUser.username

                  return (
                    <tr key={acc.username} className="hover:bg-[#fafcfb] transition-colors">
                      {/* Username */}
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#eef8f3] font-mono text-xs font-extrabold text-[#075b3d] ring-1 ring-[#b8cfc2]">
                            {acc.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-[#10251c]">{acc.username}</span>
                            {isCurrentAdmin && (
                              <span className="ml-1.5 inline-block rounded bg-[#dff4e8] px-1.5 py-0.2 text-[9px] font-extrabold text-[#075b3d]">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Name & Title */}
                      <td className="px-3 py-4">
                        <p className="font-bold text-[#10251c]">{acc.name}</p>
                        <p className="text-[10px] text-[#718279]">
                          {acc.nik ? `NIK: ${acc.nik} · ` : ''}
                          {acc.title}
                        </p>
                      </td>

                      {/* Role & Dept */}
                      <td className="px-3 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              acc.role === 'admin'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : acc.role === 'admin_lobby'
                                ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                : acc.role === 'approver_pool'
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : acc.role === 'approver'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : acc.role === 'driver'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : acc.role === 'security'
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : acc.role === 'coupon'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-[#eef5f0] text-[#075b3d] border border-[#c4ded0]'
                            }`}
                          >
                            {ROLE_LABEL[acc.role]}
                          </span>
                          {acc.dept && (
                            <span className="text-[10px] text-[#62736b] font-medium leading-tight">
                              {acc.dept}{acc.section ? ` · ${acc.section}` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Password Cell with Protected Reveal */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg border border-[#e2ece5] bg-[#f8faf9] px-2.5 py-1 font-mono text-[11px] shadow-2xs">
                            <Lock size={12} className="text-[#889990]" />
                            <span className="font-semibold text-[#10251c] select-all">
                              {isRevealed ? acc.password : '••••••••'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePassword(acc)}
                            title={isRevealed ? 'Sembunyikan password' : 'Lihat password (Verifikasi Admin)'}
                            className={`flex size-7 items-center justify-center rounded-lg border transition ${
                              isRevealed
                                ? 'border-[#b8cfc2] bg-[#eef8f3] text-[#075b3d] hover:bg-[#e2f3ea]'
                                : 'border-[#dce7df] bg-white text-[#62736b] hover:bg-[#f2f6f4] hover:text-[#10251c]'
                            }`}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            title="Edit Akun & Ubah Password"
                            className="flex size-7 items-center justify-center rounded-lg border border-[#dce7df] bg-white text-[#62736b] transition hover:border-[#075b3d] hover:bg-[#eef8f3] hover:text-[#075b3d]"
                          >
                            <Edit3 size={13} />
                          </button>
                          {acc.username !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.username)}
                              title="Hapus Akun"
                              className="flex size-7 items-center justify-center rounded-lg border border-[#fee2e2] bg-white text-[#dc2626] transition hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredAccounts.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] bg-[#f8faf9] px-5 py-3">
            <div className="text-[11px] font-medium text-[#62736b]">
              Halaman <span className="font-bold text-[#10251c]">{currentPage}</span> dari {totalPages} (Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAccounts.length)} dari {filteredAccounts.length} akun)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-[#dce7df] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#10251c] transition hover:bg-[#eef5f0] disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft size={14} />
                Sebelumnya
              </button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`size-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pg
                        ? 'bg-[#075b3d] text-white shadow-xs'
                        : 'border border-[#dce7df] bg-white text-[#62736b] hover:bg-[#eef5f0]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-lg border border-[#dce7df] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#10251c] transition hover:bg-[#eef5f0] disabled:opacity-40 disabled:pointer-events-none"
              >
                Selanjutnya
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Verifikasi Password Admin untuk Melihat Password */}
      {verifyModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#f8faf9] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#075b3d] text-white">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#10251c]">Verifikasi Keamanan Admin</h3>
                  <p className="text-[10px] text-[#62736b]">Otentikasi diperlukan untuk melihat password</p>
                </div>
              </div>
              <button
                onClick={() => setVerifyModalTarget(null)}
                className="rounded-lg p-1 text-[#8b9b92] hover:bg-[#eef3f0] hover:text-[#10251c]"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPassword} className="p-5 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
                <p className="font-semibold flex items-center gap-1.5 text-blue-950">
                  <KeyRound size={13} />
                  Melihat Password Akun:
                </p>
                <p className="mt-1 font-mono text-[11px] font-bold text-blue-800">
                  {verifyModalTarget.name} ({verifyModalTarget.username})
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                  Masukkan Password Admin Anda:
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9b92]" />
                  <input
                    type="password"
                    autoFocus
                    placeholder="Password admin..."
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value)
                      setVerifyError('')
                    }}
                    className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] pl-9 pr-3 text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                    required
                  />
                </div>
                {verifyError && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {verifyError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setVerifyModalTarget(null)}
                  className="rounded-xl border border-[#dce7df] px-3.5 py-2 text-xs font-semibold text-[#62736b] hover:bg-[#f4f7f5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#075b3d] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#064e34]"
                >
                  <Check size={14} />
                  Verifikasi & Tampilkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah / Edit Akun */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden my-auto max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#f8faf9] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#075b3d] text-white">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10251c]">
                    {editingAccount ? `Edit Akun: ${editingAccount.username}` : 'Tambah Akun Pengguna Baru'}
                  </h3>
                  <p className="text-[10px] text-[#62736b]">
                    {editingAccount ? 'Perbarui ID, nama, password, atau jabatan' : 'Daftarkan akun baru ke sistem JAI-Fleet'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="rounded-lg p-1.5 text-[#8b9b92] hover:bg-[#eef3f0] hover:text-[#10251c]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username / ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#10251c]">
                      Username / ID Akun <span className="text-red-500">*</span>
                    </label>
                    {editingAccount && (
                      <span className="text-[10px] font-medium text-[#075b3d] bg-[#eef8f3] px-1.5 py-0.5 rounded">
                        Dapat Diubah
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="misal: requester3, driver5"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 font-mono text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                  />
                  {editingAccount && (
                    <p className="mt-1 text-[10px] text-[#718279]">
                      Admin dapat mengubah username ini. Pastikan username baru unik.
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      required
                      placeholder="Masukkan password..."
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] pl-3 pr-9 font-mono text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b9b92] hover:text-[#10251c]"
                    >
                      {formShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                  Nama Lengkap Pengguna <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Budi Santoso, Rina Kartika"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                    Peran (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs font-semibold text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                  >
                    <option value="requester">Requester (Pemohon)</option>
                    <option value="approver">Approver SPV Departemen (Tahap 1)</option>
                    <option value="approver_pool">Approver SPV Kendaraan (Tahap 2)</option>
                    <option value="admin">Super Admin (Pool GA)</option>
                    <option value="admin_lobby">Admin Lobby Frontdesk</option>
                    <option value="driver">Driver (Sopir)</option>
                    <option value="security">Security Gerbang</option>
                    <option value="coupon">Admin Kupon</option>
                  </select>
                </div>

                {/* NIK */}
                <div>
                  <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                    NIK Karyawan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="misal: JAI-2018042"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 font-mono text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                  />
                </div>
              </div>

              {/* Department & Section (if requester or approver / approver_pool) */}
              {['requester', 'approver', 'approver_pool'].includes(formData.role) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                      Departemen / Divisi
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => {
                        const newDept = e.target.value
                        const availableSecs = getSectionsByDept(newDept)
                        setFormData({
                          ...formData,
                          dept: newDept,
                          section: availableSecs[0] || '',
                        })
                      }}
                      className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs font-semibold text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                      Section (Bagian)
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs font-semibold text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                    >
                      {getSectionsByDept(formData.dept).map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Driver Link (if role === driver) */}
              {formData.role === 'driver' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                    Hubungkan ke Data Master Sopir
                  </label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs font-semibold text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                  >
                    <option value="">-- Pilih Personil Sopir --</option>
                    {db.drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.id} · {d.defaultPlate || 'Tanpa Mobil Default'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title / Jabatan */}
              <div>
                <label className="block text-[11px] font-bold text-[#10251c] mb-1">
                  Deskripsi Jabatan / Title
                </label>
                <input
                  type="text"
                  placeholder="misal: SPV Departemen Procurement, Driver Operasional Innova"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[#dce7df] bg-[#fafcfb] px-3 text-xs text-[#10251c] focus:border-[#075b3d] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-xl border border-[#dce7df] px-4 py-2.5 text-xs font-semibold text-[#62736b] hover:bg-[#f4f7f5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#075b3d] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#075b3d]/20 hover:bg-[#064e34]"
                >
                  {editingAccount ? 'Simpan Perubahan' : 'Tambahkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
