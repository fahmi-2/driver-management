'use client'

import { useState } from 'react'
import { Clock3, Download, Edit3, Phone, Plus, Shield, Trash2, Truck, UserCheck, UserPlus, UserRound, X } from 'lucide-react'
import { COUPON_LABEL, STATUS_LABEL, driverState, fmtDate, fmtDur, fmtTime, useStore, vehicleState, type Driver, type ShiftType, type Trip } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, btnGhost, btnPrimary, couponTone, inputCls, tdCls, thCls, tripTone, useToast } from '../ui-bits'
import { WorkloadCard } from './dashboard'

function AssignRow({ trip }: { trip: Trip }) {
  const { db, assignTrip } = useStore()
  const notify = useToast()
  const [driverId, setDriverId] = useState('')
  const [plate, setPlate] = useState('')
  const drivers = db.drivers.filter((d) => driverState(db, d.id) === 'Tersedia')
  const plateBusy = !!plate && db.vehicles.some((v) => v.plate === plate) && vehicleState(db, plate) !== 'Tersedia'

  return (
    <li className="grid gap-3 px-5 py-4 text-xs lg:grid-cols-[1.2fr_1.6fr_auto] lg:items-end">
      <div>
        <p className="font-bold">{trip.guest} <span className="font-normal text-[#93a097]">· {trip.requesterName} ({trip.dept})</span></p>
        <p className="mt-0.5 text-[#708078]">{trip.destination}</p>
        <p className="mt-0.5 text-[11px] text-[#93a097]">{trip.category} · {fmtDate(trip.date)} {trip.estDeparture} · Disetujui {trip.spvName} (E-Sign)</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="font-semibold text-[#66766d]">Sopir
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputCls}>
            <option value="">Pilih sopir…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="font-semibold text-[#66766d]">No. Pol
          <input list="plates" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="B 1234 XYZ" className={inputCls} />
          <datalist id="plates">{db.vehicles.map((v) => <option key={v.plate} value={v.plate}>{v.type}</option>)}</datalist>
        </label>
      </div>
      <button disabled={!driverId || !plate.trim() || plateBusy} onClick={() => { assignTrip(trip.id, driverId, plate.trim()); notify('Driver ditugaskan — siap di Gate Clearance') }} className={btnPrimary}><UserCheck size={14} />{plateBusy ? 'Kendaraan dipakai' : 'Assign'}</button>
    </li>
  )
}

export function AdminApproval() {
  const { db } = useStore()
  const waiting = db.trips.filter((t) => t.status === 'WAITING_ASSIGN')
  const pendingSpv = db.trips.filter((t) => t.status === 'WAITING_SPV')
  const ready = db.trips.filter((t) => t.status === 'READY')
  return (
    <>
      <PageHeader title="Waiting List & Assignment" desc="Pengajuan yang sudah di-ACC SPV. Pilih sopir dan isi nomor polisi." />
      <Card title="Waiting List Approval" subtitle={`${waiting.length} menunggu assign`}>
        {waiting.length === 0 ? <Empty text="Tidak ada pengajuan yang menunggu assign." /> : <ul className="divide-y divide-[#edf1ee]">{waiting.map((t) => <AssignRow key={t.id} trip={t} />)}</ul>}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Siap Berangkat" subtitle="Sudah di-assign, menunggu Security">
          {ready.length === 0 ? <Empty text="Kosong" /> : <ul className="divide-y divide-[#edf1ee]">{ready.map((t) => <li key={t.id} className="px-5 py-3 text-xs"><p className="font-bold">{t.destination}</p><p className="text-[11px] text-[#708078]">{db.drivers.find((d) => d.id === t.driverId)?.name} · {t.plate}</p></li>)}</ul>}
        </Card>
        <Card title="Menunggu Persetujuan SPV" subtitle="Belum e-sign">
          {pendingSpv.length === 0 ? <Empty text="Kosong" /> : <ul className="divide-y divide-[#edf1ee]">{pendingSpv.map((t) => <li key={t.id} className="px-5 py-3 text-xs"><p className="font-bold">{t.destination}</p><p className="text-[11px] text-[#708078]">{t.requesterName} · {t.spvName}</p></li>)}</ul>}
        </Card>
      </div>
    </>
  )
}

function exportExcel(rows: Trip[], driverName: (id?: string) => string) {
  const head = ['TGL', 'USER', 'TUJUAN', 'JARAK (KM)', 'TIME GO', 'TIME BACK', 'DURATION', 'DRIVER', 'NO POL', 'KUPON']
  const lines = rows.map((t) => [t.date, t.guest, t.destination, t.distance_km ? `${t.distance_km} KM` : '—', fmtTime(t.timeGo), fmtTime(t.timeBack), fmtDur(t.durationMin), driverName(t.driverId), t.plate ?? '', COUPON_LABEL[t.coupon]])
  const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeffsep=;\r\n' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `live-data-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminLiveData() {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const rows = db.trips
    .filter((t) => t.status !== 'WAITING_SPV' && t.status !== 'REJECTED')
    .filter((t) => `${t.guest} ${t.destination} ${dn(t.driverId)}`.toLowerCase().includes(q.toLowerCase()))
    .slice().sort((a, b) => (b.date + (b.timeGo ?? '')).localeCompare(a.date + (a.timeGo ?? '')))

  return (
    <>
      <PageHeader title="Live Data" desc="Tabel operasional otomatis dari klik Security." action={<button id="export-excel" onClick={() => exportExcel(rows, dn)} className={btnPrimary}><Download size={14} />Export to Excel</button>} />
      <Card title="Data Operasional" subtitle={`${rows.length} baris`} action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari user / tujuan / driver…" className="h-8 w-56 rounded-lg bg-[#f5f7f5] px-3 text-[11px] outline-none" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-[#edf1ee] bg-[#f7faf8] text-[10px] font-bold uppercase tracking-wider text-[#9aa7a0]">
              <tr>
                {['TGL', 'USER', 'TUJUAN', 'JARAK', 'TIME GO', 'TIME BACK', 'DURATION', 'DRIVER', 'NO. POL', 'STATUS', 'KUPON'].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-[#93a097]">
                    Tidak ada data operasional.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-[#fafcfb] transition">
                    <td className="px-4 py-3.5 text-[#9bb7a8] whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#10251c] whitespace-nowrap">{t.guest}</td>
                    <td className="px-4 py-3.5 text-[#ecfdf5] font-medium whitespace-nowrap">{t.destination}</td>
                    <td className="px-4 py-3.5 font-semibold text-[#bef264] whitespace-nowrap">{t.distance_km ? `${t.distance_km} KM` : '—'}</td>
                    <td className="px-4 py-3.5 text-[#9bb7a8] whitespace-nowrap">{fmtTime(t.timeGo)}</td>
                    <td className="px-4 py-3.5 text-[#9bb7a8] whitespace-nowrap">{fmtTime(t.timeBack)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#bef264] whitespace-nowrap">{fmtDur(t.durationMin)}</td>
                    <td className="px-4 py-3.5 font-medium text-[#ecfdf5] whitespace-nowrap">{dn(t.driverId)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[#a3e635] whitespace-nowrap">{t.plate ?? '—'}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><Pill label={STATUS_LABEL[t.status]} tone={tripTone(t.status)} /></td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{t.coupon === 'NONE' ? '—' : <Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function AdminWorkload() {
  return (
    <>
      <PageHeader title="Beban Kerja Driver" desc="Pastikan pembagian tugas yang adil antar driver." />
      <WorkloadCard />
    </>
  )
}

const SHIFT_OPTIONS: ShiftType[] = [
  'Pagi (07:00 - 15:00)',
  'Siang (15:00 - 23:00)',
  'Malam (23:00 - 07:00)',
  'General (08:00 - 17:00)',
]

export function AdminDrivers() {
  const { db, addDriver, updateDriver, removeDriver, toggleLeave } = useStore()
  const notify = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    shift: 'Pagi (07:00 - 15:00)' as ShiftType,
    defaultPlate: '',
    simType: 'SIM A',
    onLeave: false,
  })

  const openAddModal = () => {
    setEditingDriver(null)
    setFormData({
      name: '',
      phone: '',
      shift: 'Pagi (07:00 - 15:00)',
      defaultPlate: '',
      simType: 'SIM A',
      onLeave: false,
    })
    setShowModal(true)
  }

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone || '',
      shift: (driver.shift as ShiftType) || 'General (08:00 - 17:00)',
      defaultPlate: driver.defaultPlate || '',
      simType: driver.simType || 'SIM A',
      onLeave: !!driver.onLeave,
    })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    if (editingDriver) {
      updateDriver(editingDriver.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        shift: formData.shift,
        defaultPlate: formData.defaultPlate.trim().toUpperCase() || undefined,
        simType: formData.simType.trim() || undefined,
        onLeave: formData.onLeave,
      })
      notify(`Data sopir "${formData.name.trim()}" berhasil diperbarui!`)
    } else {
      addDriver({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        shift: formData.shift,
        defaultPlate: formData.defaultPlate.trim().toUpperCase() || undefined,
        simType: formData.simType.trim() || undefined,
      })
      notify(`Sopir "${formData.name.trim()}" berhasil didaftarkan!`)
    }

    setShowModal(false)
    setEditingDriver(null)
  }

  const filteredDrivers = db.drivers.filter((d) => {
    const s = driverState(db, d.id)
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.phone && d.phone.toLowerCase().includes(search.toLowerCase())) ||
      (d.defaultPlate && d.defaultPlate.toLowerCase().includes(search.toLowerCase()))
    const matchShift = shiftFilter === 'ALL' || d.shift === shiftFilter
    const matchStatus = statusFilter === 'ALL' || s === statusFilter
    return matchSearch && matchShift && matchStatus
  })

  const countAvailable = db.drivers.filter((d) => driverState(db, d.id) === 'Tersedia').length
  const countOnDuty = db.drivers.filter((d) => driverState(db, d.id) === 'Sedang Bertugas').length
  const countLeave = db.drivers.filter((d) => driverState(db, d.id) === 'Cuti').length

  return (
    <>
      <PageHeader
        title="Daftar Sopir"
        desc="Kelola data personil driver pool armada, jadwal shift kerja, dan status tugas."
        action={
          <button
            id="btn-add-driver"
            onClick={openAddModal}
            className={btnPrimary}
          >
            <UserPlus size={15} />
            Daftarkan Sopir Baru
          </button>
        }
      />

      {/* Summary KPI Badges */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#e4ece6]">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Total Sopir</p>
            <p className="mt-1 text-2xl font-bold text-[#10251c]">{db.drivers.length} Orang</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#eef5f0] text-[#075b3d]">
            <UserRound size={20} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#e4ece6]">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Siap / Tersedia</p>
            <p className="mt-1 text-2xl font-bold text-[#168052]">{countAvailable} Sopir</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#dff5e9] text-[#168052]">
            <UserCheck size={20} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#e4ece6]">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Sedang Bertugas</p>
            <p className="mt-1 text-2xl font-bold text-[#3273b9]">{countOnDuty} Sopir</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#e4efff] text-[#3273b9]">
            <Truck size={20} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#e4ece6]">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Sedang Cuti / Izin</p>
            <p className="mt-1 text-2xl font-bold text-[#74817b]">{countLeave} Sopir</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#eef1ef] text-[#74817b]">
            <Clock3 size={20} />
          </div>
        </div>
      </div>

      <Card
        title="Database &amp; Status Personil Sopir"
        subtitle={`Menampilkan ${filteredDrivers.length} dari ${db.drivers.length} sopir`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / plat / telp…"
              className="h-8 w-44 sm:w-56 rounded-lg bg-[#f5f7f5] px-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
            />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="h-8 rounded-lg bg-[#f5f7f5] px-2 text-[11px] outline-none text-[#506056] border border-transparent focus:border-[#075b3d]"
            >
              <option value="ALL">Semua Shift</option>
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg bg-[#f5f7f5] px-2 text-[11px] outline-none text-[#506056] border border-transparent focus:border-[#075b3d]"
            >
              <option value="ALL">Semua Status</option>
              <option value="Tersedia">Tersedia</option>
              <option value="Sedang Bertugas">Sedang Bertugas</option>
              <option value="Cuti">Cuti</option>
            </select>
          </div>
        }
      >
        {filteredDrivers.length === 0 ? (
          <Empty text="Tidak ada sopir yang cocok dengan filter pencarian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#f7faf8]">
                <tr>
                  <th className={thCls}>NAMA SOPIR</th>
                  <th className={thCls}>SHIFT KERJA</th>
                  <th className={thCls}>ALOKASI MOBIL / PLAT</th>
                  <th className={thCls}>STATUS TUGAS</th>
                  <th className={thCls}>INFO PENUGASAN AKTIF</th>
                  <th className={thCls}>KONTAK &amp; LISENSI</th>
                  <th className={`${thCls} text-right`}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((d) => {
                  const s = driverState(db, d.id)
                  const activeTrip = db.trips.find(
                    (t) => t.driverId === d.id && (t.status === 'READY' || t.status === 'ON_TRIP')
                  )
                  const tone = s === 'Tersedia' ? 'green' : s === 'Sedang Bertugas' ? 'blue' : 'gray'

                  return (
                    <tr key={d.id} className="border-t border-[#edf1ee] hover:bg-[#fafcfb]">
                      <td className={tdCls}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-[#dff5e9] font-bold text-[#138053] text-xs">
                            {d.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-[#10251c]">{d.name}</p>
                            <p className="text-[10px] text-[#93a097]">ID: {d.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-1.5 text-[#506056]">
                          <Clock3 size={13} className="text-[#93a097]" />
                          <span className="font-medium text-[11px]">{d.shift ?? 'General (08:00 - 17:00)'}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {activeTrip?.plate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-bold text-[#075b3d]">
                              <Truck size={12} />
                              {activeTrip.plate}
                            </span>
                            <p className="text-[10px] text-[#708078]">
                              {db.vehicles.find((v) => v.plate === activeTrip.plate)?.type || 'Armada Operasional'}
                            </p>
                          </div>
                        ) : d.defaultPlate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[#506056] font-semibold">
                              <Truck size={12} className="text-[#93a097]" />
                              {d.defaultPlate}
                            </span>
                            <p className="text-[10px] text-[#93a097]">
                              {db.vehicles.find((v) => v.plate === d.defaultPlate)?.type || 'Mobil Default'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#93a097] text-[11px] italic">Fleksibel / Pool Bebas</span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Pill label={s} tone={tone} />
                      </td>
                      <td className={tdCls}>
                        {activeTrip ? (
                          <div className="max-w-[200px] truncate text-[11px]">
                            <p className="font-semibold text-[#10251c] truncate">{activeTrip.destination}</p>
                            <p className="text-[10px] text-[#708078] truncate">
                              {activeTrip.guest} · {activeTrip.status === 'ON_TRIP' ? `Keluar ${fmtTime(activeTrip.timeGo)}` : 'Siap di gerbang'}
                            </p>
                          </div>
                        ) : d.onLeave ? (
                          <span className="text-[10px] text-[#a5700b] bg-[#fff1d6] px-2 py-0.5 rounded font-medium">
                            Izin / Cuti
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#93a097]">Siap ditugaskan</span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="space-y-0.5 text-[11px]">
                          {d.phone && (
                            <p className="flex items-center gap-1 text-[#506056]">
                              <Phone size={11} className="text-[#93a097]" />
                              {d.phone}
                            </p>
                          )}
                          {d.simType && (
                            <p className="flex items-center gap-1 text-[#708078]">
                              <Shield size={11} className="text-[#93a097]" />
                              {d.simType}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => openEditModal(d)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce7df] bg-white px-3 py-1.5 text-xs font-semibold text-[#10251c] shadow-xs hover:border-[#075b3d] hover:bg-[#f2f8f4] hover:text-[#075b3d] transition"
                          >
                            <Edit3 size={13} className="text-[#075b3d]" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Tambah / Edit Sopir */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#dce7df] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf1ee] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#dff5e9] text-[#075b3d]">
                  {editingDriver ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#10251c]">
                    {editingDriver ? 'Edit Profil & Data Sopir' : 'Pendaftaran Sopir Baru'}
                  </h3>
                  <p className="text-xs text-[#506056]">
                    {editingDriver
                      ? 'Perbarui identitas, shift kerja, kendaraan pegangan, dan status cuti.'
                      : 'Tambahkan data sopir ke dalam sistem armada pabrik'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingDriver(null)
                }}
                className="rounded-lg p-1.5 text-[#506056] hover:bg-[#edf2ef] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#10251c]">
                  Nama Lengkap Sopir <span className="text-[#b83a31]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rahmat Hidayat"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#10251c]">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    placeholder="0812-xxxx-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#10251c]">
                    Golongan SIM
                  </label>
                  <select
                    value={formData.simType}
                    onChange={(e) => setFormData({ ...formData, simType: e.target.value })}
                    className={inputCls}
                  >
                    <option value="SIM A">SIM A (Mobil Penumpang)</option>
                    <option value="SIM B1">SIM B1 (Bus/Truk Ringan)</option>
                    <option value="SIM B1 Umum">SIM B1 Umum</option>
                    <option value="SIM B2 Umum">SIM B2 Umum (Alat Berat)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#10251c]">
                    Jadwal Shift Kerja <span className="text-[#b83a31]">*</span>
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as ShiftType })}
                    className={inputCls}
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10251c]">
                    Alokasi Mobil / Default (Opsional)
                  </label>
                  <input
                    list="registered-plates"
                    placeholder="Pilih atau ketik No. Pol"
                    value={formData.defaultPlate}
                    onChange={(e) => setFormData({ ...formData, defaultPlate: e.target.value.toUpperCase() })}
                    className={inputCls}
                  />
                  <datalist id="registered-plates">
                    {db.vehicles.map((v) => (
                      <option key={v.plate} value={v.plate}>
                        {v.type} ({v.plate})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Status Kehadiran / Cuti dengan Warna Kontras Tinggi */}
              <div className="rounded-xl border border-[#cfe0d5] bg-[#f2f8f4] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#081e13]">Status Cuti / Izin Kerja</p>
                    <p className="text-[11px] font-medium text-[#2f4f3e]">
                      Tandai apakah sopir sedang berhalangan hadir atau cuti
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, onLeave: !formData.onLeave })}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                      formData.onLeave
                        ? 'bg-[#fee2e2] text-[#991b1b] border border-[#f87171] hover:bg-[#fecaca]'
                        : 'bg-[#dff5e9] text-[#064e3b] border border-[#34d399] hover:bg-[#c9efd8]'
                    }`}
                  >
                    <span className={`size-2 rounded-full ${formData.onLeave ? 'bg-[#dc2626]' : 'bg-[#059669]'}`} />
                    {formData.onLeave ? 'Sedang Cuti / Izin' : 'Aktif Bekerja'}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#edf1ee] pt-4">
                {editingDriver ? (
                  <button
                    type="button"
                    onClick={() => {
                      const activeTrip = db.trips.find(
                        (t) => t.driverId === editingDriver.id && (t.status === 'READY' || t.status === 'ON_TRIP')
                      )
                      if (activeTrip) {
                        const confirmWithWarning = confirm(
                          `PERINGATAN SISTEM:\nSopir "${editingDriver.name}" saat ini SEDANG BERTUGAS aktif (Tujuan: ${activeTrip.destination}).\n\nMenghapus data dapat mempengaruhi riwayat penugasan armada.\n\nApakah Anda benar-benar yakin ingin tetap menghapus sopir ini?`
                        )
                        if (!confirmWithWarning) return
                      } else {
                        if (!confirm(`Hapus data sopir "${editingDriver.name}" dari sistem?`)) return
                      }
                      removeDriver(editingDriver.id)
                      notify(`Sopir "${editingDriver.name}" telah dihapus.`)
                      setShowModal(false)
                      setEditingDriver(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 hover:border-red-300"
                  >
                    <Trash2 size={13} />
                    Hapus Sopir
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingDriver(null)
                    }}
                    className={btnGhost}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={btnPrimary}
                  >
                    {editingDriver ? <Edit3 size={14} /> : <UserPlus size={14} />}
                    {editingDriver ? 'Simpan Perubahan' : 'Simpan Sopir'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

