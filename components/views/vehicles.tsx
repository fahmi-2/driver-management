'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, Truck, AlertTriangle, CheckCircle, Search, Wrench, ShieldCheck, X } from 'lucide-react'
import { useStore, type Vehicle, type VehicleStatus } from '@/lib/store'
import { Card, PageHeader, Pill, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'

export function AdminVehicles() {
  const { db, addVehicle, updateVehicle, removeVehicle } = useStore()
  const notify = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | VehicleStatus>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlate, setEditingPlate] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    plate: '',
    type: '',
    status: 'Active' as VehicleStatus,
  })

  const openAddModal = () => {
    setEditingPlate(null)
    setFormData({ plate: '', type: '', status: 'Active' })
    setIsModalOpen(true)
  }

  const openEditModal = (v: Vehicle) => {
    setEditingPlate(v.plate)
    setFormData({ plate: v.plate, type: v.type, status: v.status || 'Active' })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPlate = formData.plate.trim().toUpperCase()
    if (!cleanPlate || !formData.type.trim()) return

    if (editingPlate) {
      updateVehicle(editingPlate, {
        plate: cleanPlate,
        type: formData.type.trim(),
        status: formData.status,
      })
      notify(`Kendaraan ${cleanPlate} berhasil diperbarui!`)
    } else {
      if (db.vehicles.some((v) => v.plate.toLowerCase() === cleanPlate.toLowerCase())) {
        alert('Nomor polisi tersebut sudah terdaftar di sistem!')
        return
      }
      addVehicle({
        plate: cleanPlate,
        type: formData.type.trim(),
        status: formData.status,
      })
      notify(`Kendaraan baru ${cleanPlate} berhasil ditambahkan!`)
    }
    setIsModalOpen(false)
  }

  const handleDelete = (plate: string) => {
    // Check if vehicle has any active trips
    const hasActiveTrip = db.trips.some(
      (t) => t.plate === plate && (t.status === 'READY' || t.status === 'ON_TRIP')
    )
    if (hasActiveTrip) {
      alert(`Kendaraan ${plate} tidak dapat dihapus karena sedang dalam tugas (READY / ON_TRIP)!`)
      return
    }
    if (confirm(`Yakin ingin menghapus armada ${plate} dari database?`)) {
      removeVehicle(plate)
      notify(`Armada ${plate} berhasil dihapus.`)
    }
  }

  const filteredVehicles = db.vehicles.filter((v) => {
    const matchSearch =
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || (v.status || 'Active') === filterStatus
    return matchSearch && matchStatus
  })

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
              className="h-8 rounded-lg bg-[#f5f7f5] px-2.5 text-[11px] font-medium text-[#62736b] outline-none border border-transparent focus:border-[#075b3d]"
            >
              <option value="ALL">Semua Status</option>
              <option value="Active">Hanya Aktif</option>
              <option value="Maintenance">Hanya Maintenance</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="border-b border-[#edf1ee] bg-[#f7faf8] text-[10px] font-bold uppercase tracking-wider text-[#9aa7a0]">
              <tr>
                <th className="px-5 py-3">No. Polisi (Plat)</th>
                <th className="px-5 py-3">Nama / Tipe Kendaraan</th>
                <th className="px-5 py-3">Status Operasional</th>
                <th className="px-5 py-3">Status Penugasan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#93a097]">
                    Tidak ada kendaraan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const isMaintenance = v.status === 'Maintenance'
                  const activeTrip = db.trips.find(
                    (t) => t.plate === v.plate && (t.status === 'READY' || t.status === 'ON_TRIP')
                  )

                  return (
                    <tr key={v.plate} className="hover:bg-[#fafcfb] transition">
                      <td className="px-5 py-3.5 font-bold font-mono text-[#10251c]">{v.plate}</td>
                      <td className="px-5 py-3.5 text-[#3b4942] font-medium">{v.type}</td>
                      <td className="px-5 py-3.5">
                        <Pill
                          label={isMaintenance ? 'Maintenance (Bengkel)' : 'Active (Siap Pakai)'}
                          tone={isMaintenance ? 'red' : 'green'}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        {activeTrip ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#e4efff] px-2 py-0.5 text-[10px] font-semibold text-[#1e40af]">
                            <span className="size-1.5 animate-pulse rounded-full bg-[#1e40af]" />
                            {activeTrip.status === 'ON_TRIP' ? 'Sedang Bertugas' : 'Siap Berangkat'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#93a097]">Idle / Standby</span>
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
      </Card>

      {/* Modal Add / Edit Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden">
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <label className="block text-xs font-semibold text-[#66766d]">
                Nama / Tipe Kendaraan
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Contoh: Toyota Innova Reborn / Avanza"
                  className={inputCls}
                  required
                />
              </label>

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
