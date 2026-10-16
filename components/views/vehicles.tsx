'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Truck, AlertTriangle, CheckCircle, Search, Wrench, ShieldCheck, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore, type Vehicle, type VehicleStatus } from '@/lib/store'
import { Card, PageHeader, Pill, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'

export function AdminVehicles() {
  const { db, addVehicle, updateVehicle, removeVehicle } = useStore()
  const notify = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | VehicleStatus>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlate, setEditingPlate] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Form State
  const [formData, setFormData] = useState({
    plate: '',
    type: '',
    capacity: 7,
    status: 'Active' as VehicleStatus,
    category: 'Mobil Operasional' as any,
    dedicatedUser: '',
  })

  const openAddModal = () => {
    setEditingPlate(null)
    setFormData({ plate: '', type: '', capacity: 7, status: 'Active', category: 'Mobil Operasional', dedicatedUser: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (v: Vehicle) => {
    setEditingPlate(v.plate)
    setFormData({
      plate: v.plate,
      type: v.type,
      capacity: v.capacity ?? 7,
      status: v.status || 'Active',
      category: v.category || 'Mobil Operasional',
      dedicatedUser: v.dedicatedUser || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPlate = formData.plate.trim().toUpperCase()
    if (!cleanPlate || !formData.type.trim()) return

    if (editingPlate) {
      const res = await updateVehicle(editingPlate, {
        plate: cleanPlate,
        type: formData.type.trim(),
        capacity: Number(formData.capacity) || 7,
        status: formData.status,
        category: formData.category,
        dedicatedUser: formData.dedicatedUser.trim() || undefined,
      })
      if (!res.success) {
        alert(`Gagal memperbarui kendaraan di database: ${res.error || 'Terjadi kesalahan'}`)
        return
      }
      notify(`Kendaraan ${cleanPlate} berhasil diperbarui!`)
    } else {
      if (db.vehicles.some((v) => v.plate.toLowerCase() === cleanPlate.toLowerCase())) {
        alert('Nomor polisi tersebut sudah terdaftar di sistem!')
        return
      }
      const res = await addVehicle({
        plate: cleanPlate,
        type: formData.type.trim(),
        capacity: Number(formData.capacity) || 7,
        status: formData.status,
        category: formData.category,
        dedicatedUser: formData.dedicatedUser.trim() || undefined,
      })
      if (!res.success) {
        alert(`Gagal menambahkan kendaraan ke database: ${res.error || 'Terjadi kesalahan'}`)
        return
      }
      notify(`Kendaraan baru ${cleanPlate} berhasil ditambahkan!`)
    }
    setIsModalOpen(false)
  }

  const handleDelete = async (plate: string) => {
    // Check if vehicle has any active trips
    const hasActiveTrip = db.trips.some(
      (t) => t.plate === plate && (t.status === 'READY' || t.status === 'ON_TRIP')
    )
    if (hasActiveTrip) {
      alert(`Kendaraan ${plate} tidak dapat dihapus karena sedang dalam tugas (READY / ON_TRIP)!`)
      return
    }
    if (confirm(`Yakin ingin menghapus armada ${plate} dari database?`)) {
      const res = await removeVehicle(plate)
      if (!res.success) {
        alert(`Gagal menghapus kendaraan dari database: ${res.error || 'Terjadi kesalahan'}`)
        return
      }
      notify(`Armada ${plate} berhasil dihapus.`)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterStatus])

  const filteredVehicles = db.vehicles.filter((v) => {
    const matchSearch =
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || (v.status || 'Active') === filterStatus
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const countActive = db.vehicles.filter((v) => (v.status || 'Active') === 'Active').length
  const countMaint = db.vehicles.filter((v) => v.status === 'Maintenance').length

  return (
    <>
      <PageHeader
        title="Daftar Kendaraan"
        desc="Kelola master data armada, status operasional, dan nomor polisi untuk Resource Timeline."
        action={
          <button onClick={openAddModal} className={btnPrimary}>
            <Plus size={15} />
            Tambah Kendaraan Baru
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Total Armada</p>
            <p className="mt-1 text-2xl font-bold text-[#10251c]">{db.vehicles.length} Unit</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#eef5f0] text-[#075b3d]">
            <Truck size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Aktif / Siap Operasi</p>
            <p className="mt-1 text-2xl font-bold text-[#168052]">{countActive} Unit</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#dff5e9] text-[#168052]">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Perawatan / Bengkel</p>
            <p className="mt-1 text-2xl font-bold text-[#b91c1c]">{countMaint} Unit</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#fee2e2] text-[#b91c1c]">
            <Wrench size={20} />
          </div>
        </div>
      </div>

      <Card
        title="Master Data Armada"
        subtitle={`Daftar kendaraan ini menjadi Y-Axis (Resources) pada Resource Timeline Scheduler.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#93a097]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari plat atau jenis mobil…"
                className="h-8 w-44 sm:w-56 rounded-lg bg-[#f5f7f5] pl-8 pr-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-8 rounded-lg bg-[#f0f4f1] px-2.5 text-[11px] font-semibold text-[#10251c] outline-none border border-[#d2ddd6] focus:border-[#075b3d]"
            >
              <option value="ALL">Semua Status</option>
              <option value="Active">Hanya Aktif</option>
              <option value="Maintenance">Hanya Maintenance</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-emerald-500/20 bg-emerald-950/40 text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
              <tr>
                <th className="px-5 py-3.5">No. Polisi (Plat)</th>
                <th className="px-5 py-3.5">Nama / Tipe Kendaraan</th>
                <th className="px-5 py-3.5">Kategori &amp; Pemilik</th>
                <th className="px-5 py-3.5">Kapasitas</th>
                <th className="px-5 py-3.5">Status Operasional</th>
                <th className="px-5 py-3.5">Status Penugasan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs font-semibold text-[#62736b]">
                    Tidak ada kendaraan yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((v) => {
                  const isMaintenance = v.status === 'Maintenance'
                  const activeTrip = db.trips.find(
                    (t) => t.plate === v.plate && (t.status === 'READY' || t.status === 'ON_TRIP')
                  )

                  return (
                    <tr key={v.plate} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3.5 font-extrabold font-mono text-sm text-emerald-200">{v.plate}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-white">{v.type}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                              v.category === 'Mobil Expat'
                                ? 'bg-purple-900/60 text-purple-200 border border-purple-400/40'
                                : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {v.category || 'Mobil Operasional'}
                          </span>
                          {v.dedicatedUser && (
                            <span className="text-[10px] font-bold text-emerald-200 bg-emerald-900/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              User: {v.dedicatedUser}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-xs">
                        <span className="rounded-md bg-emerald-950/70 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
                          {v.capacity || 7} Kursi
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Pill
                          label={isMaintenance ? 'Maintenance (Bengkel)' : 'Active (Siap Pakai)'}
                          tone={isMaintenance ? 'red' : 'green'}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        {activeTrip ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-950/70 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-400/30">
                            <span className="size-1.5 animate-pulse rounded-full bg-blue-400" />
                            {activeTrip.status === 'ON_TRIP' ? 'Sedang Bertugas' : 'Siap Berangkat'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-300/80">Idle / Standby</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(v)}
                            className="rounded-lg p-1.5 text-[#63726a] hover:bg-[#edf5f0] hover:text-[#075b3d] transition"
                            title="Edit Data Kendaraan"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.plate)}
                            className="rounded-lg p-1.5 text-[#839089] hover:bg-[#fee2e2] hover:text-[#b91c1c] transition"
                            title="Hapus Kendaraan"
                          >
                            <Trash2 size={15} />
                          </button>
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
        {filteredVehicles.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] bg-[#f8faf9] px-5 py-3">
            <div className="text-[11px] font-medium text-[#62736b]">
              Halaman <span className="font-bold text-[#10251c]">{currentPage}</span> dari {totalPages} (Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredVehicles.length)} dari {filteredVehicles.length} kendaraan)
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
      </Card>

      {/* Modal Add / Edit Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden my-auto max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#f7faf8] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#075b3d] text-white">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10251c]">
                    {editingPlate ? 'Edit Data Kendaraan' : 'Tambah Armada Kendaraan'}
                  </h3>
                  <p className="text-[10px] text-[#708078]">Kelola master data armada pool pabrik</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-[#708078] hover:bg-[#edf2ef]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <label className="block text-xs font-semibold text-[#66766d]">
                Nomor Polisi (Plat Nomor)
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="Contoh: B 1234 XYZ"
                  className={inputCls}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-[#66766d]">
                  Nama / Tipe Kendaraan
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="Contoh: Toyota Avanza"
                    className={inputCls}
                    required
                  />
                </label>

                <label className="block text-xs font-semibold text-[#66766d]">
                  Kapasitas (Penumpang)
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    placeholder="7"
                    className={inputCls}
                    required
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#66766d]">
                  Kategori Kendaraan (Status Penggunaan)
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className={inputCls}
                  >
                    <option value="Mobil Operasional">Mobil Operasional (Umum & Tamu Pabrik)</option>
                    <option value="Mobil Expat">Mobil Expat (Direksi & Tamu Jepang)</option>
                    <option value="Mobil Sewa">Mobil Sewa (Rental Armada Cadangan)</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#66766d]">
                  User Khusus / Pemilik Kendaraan {formData.category === 'Mobil Expat' ? '(Wajib untuk Expat)' : '(Opsional)'}
                  <input
                    type="text"
                    value={formData.dedicatedUser}
                    onChange={(e) => setFormData({ ...formData, dedicatedUser: e.target.value.toUpperCase() })}
                    placeholder="Contoh: FUJIYOSHI, ISODA, KATO, TATEISHI, OPERATIONAL"
                    className={`${inputCls} font-mono`}
                  />
                </label>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#66766d]">Status Operasional</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Active' })}
                    className={`rounded-xl border p-2.5 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formData.status === 'Active'
                        ? 'border-[#075b3d] bg-[#dff5e9] text-[#075b3d]'
                        : 'border-[#dce7df] text-[#708078] hover:bg-[#f5f8f6]'
                    }`}
                  >
                    <CheckCircle size={14} />
                    Active (Aktif)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Maintenance' })}
                    className={`rounded-xl border p-2.5 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formData.status === 'Maintenance'
                        ? 'border-[#b91c1c] bg-[#fee2e2] text-[#b91c1c]'
                        : 'border-[#dce7df] text-[#708078] hover:bg-[#f5f8f6]'
                    }`}
                  >
                    <Wrench size={14} />
                    Maintenance
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${btnGhost} !px-4 !py-2`}
                >
                  Batal
                </button>
                <button type="submit" className={`${btnPrimary} !px-5 !py-2`}>
                  {editingPlate ? 'Simpan Perubahan' : 'Tambahkan Armada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
