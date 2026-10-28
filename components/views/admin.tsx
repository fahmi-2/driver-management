'use client'

import { useState, useEffect } from 'react'
import { Clock3, Download, Edit3, Phone, Plus, Shield, Trash2, Truck, UserCheck, UserPlus, UserRound, X, ChevronLeft, ChevronRight, Timer, AlertCircle, Calendar } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { COUPON_LABEL, STATUS_LABEL, driverState, fmtDate, fmtDur, fmtTime, useStore, vehicleState, ymd, type Driver, type ShiftType, type Trip } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, btnGhost, btnPrimary, couponTone, inputCls, tdCls, thCls, tripTone, useToast } from '../ui-bits'
import { WorkloadCard } from './dashboard'
import { ModalPortal } from '../modal-portal'

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

export function AdminDrivers({ user }: { user?: Account }) {
  const { db, addDriver, updateDriver, removeDriver, toggleLeave, createOvertime } = useStore()
  const notify = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modal Overtime (Lembur) - Form Ungu Wajib Start OT, End OT, Alasan
  const [overtimeDriver, setOvertimeDriver] = useState<Driver | null>(null)
  const [otForm, setOtForm] = useState({
    startOT: '17:00',
    endOT: '20:00',
    reason: '',
  })

  // Modal Cuti & Penggantian Nama Sementara
  const [leaveModalDriver, setLeaveModalDriver] = useState<Driver | null>(null)
  const [leaveReplacementName, setLeaveReplacementName] = useState('')

  // Form State (Tanpa Jam Shift: Penugasan fleksibel mengikuti admin)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    defaultPlate: '',
    simType: 'SIM A',
    onLeave: false,
    leaveReplacementName: '',
  })

  const openAddModal = () => {
    setEditingDriver(null)
    setFormData({
      name: '',
      phone: '',
      defaultPlate: '',
      simType: 'SIM A',
      onLeave: false,
      leaveReplacementName: '',
    })
    setShowModal(true)
  }

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone || '',
      defaultPlate: driver.defaultPlate || '',
      simType: driver.simType || 'SIM A',
      onLeave: !!driver.onLeave,
      leaveReplacementName: driver.leaveReplacementName || '',
    })
    setShowModal(true)
  }

  const handleOpenOvertime = (driver: Driver) => {
    setOvertimeDriver(driver)
    setOtForm({
      startOT: '17:00',
      endOT: '20:00',
      reason: '',
    })
  }

  const handleOvertimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!overtimeDriver) return
    if (!otForm.reason.trim()) {
      notify('Alasan lembur wajib diisi!', 'error')
      return
    }

    createOvertime({
      driverId: overtimeDriver.id,
      driverName: overtimeDriver.name,
      requestedBy: user?.username || 'admin',
      requestedByName: user?.name || 'Admin Pool GA',
      date: ymd(),
      startOT: otForm.startOT,
      endOT: otForm.endOT,
      reason: otForm.reason.trim(),
    })

    notify(
      `Pengajuan lembur sopir ${overtimeDriver.name} berhasil diajukan! Notifikasi dikirim ke Pak Hayu (Approver Kendaraan Tahap 2).`
    )
    setOvertimeDriver(null)
  }

  const handleOpenLeaveModal = (driver: Driver) => {
    setLeaveModalDriver(driver)
    setLeaveReplacementName(driver.leaveReplacementName || '')
  }

  const handleConfirmLeave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveModalDriver) return
    toggleLeave(leaveModalDriver.id, leaveReplacementName.trim())
    notify(
      !leaveModalDriver.onLeave
        ? `Status ${leaveModalDriver.name} diubah menjadi CUTI.${leaveReplacementName.trim() ? ` Nama sopir sementara: ${leaveReplacementName.trim()}` : ''}`
        : `Status ${leaveModalDriver.name} kembali AKTIF.`
    )
    setLeaveModalDriver(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    if (editingDriver) {
      updateDriver(editingDriver.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        defaultPlate: formData.defaultPlate.trim().toUpperCase() || undefined,
        simType: formData.simType.trim() || undefined,
        onLeave: formData.onLeave,
      })
      notify(`Data sopir "${formData.name.trim()}" berhasil diperbarui!`)
    } else {
      addDriver({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        defaultPlate: formData.defaultPlate.trim().toUpperCase() || undefined,
        simType: formData.simType.trim() || undefined,
      })
      notify(`Sopir "${formData.name.trim()}" berhasil didaftarkan!`)
    }

    setShowModal(false)
    setEditingDriver(null)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const filteredDrivers = db.drivers.filter((d) => {
    const s = driverState(db, d.id)
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.phone && d.phone.toLowerCase().includes(search.toLowerCase())) ||
      (d.defaultPlate && d.defaultPlate.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'ALL' || s === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / pageSize))
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="border-b border-emerald-500/20 bg-emerald-950/40 text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                <tr>
                  <th className={thCls}>NAMA SOPIR</th>
                  <th className={thCls}>ALOKASI KENDARAAN (1 DRIVER 1 MOBIL)</th>
                  <th className={thCls}>STATUS TUGAS</th>
                  <th className={thCls}>INFO PENUGASAN AKTIF</th>
                  <th className={thCls}>KONTAK &amp; LISENSI</th>
                  <th className={`${thCls} text-right`}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDrivers.map((d) => {
                  const s = driverState(db, d.id)
                  const activeTrip = db.trips.find(
                    (t) => t.driverId === d.id && (t.status === 'READY' || t.status === 'ON_TRIP')
                  )
                  const tone = s === 'Tersedia' ? 'green' : s === 'Sedang Bertugas' ? 'blue' : 'gray'

                  return (
                    <tr key={d.id} className="border-t border-emerald-500/10 hover:bg-white/5 transition">
                      <td className={tdCls}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20 font-extrabold text-lime-400 text-xs border border-lime-400/30">
                            {d.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-extrabold text-white text-sm">{d.name}</p>
                            <p className="text-[10px] font-semibold text-emerald-300/80">ID: {d.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {activeTrip?.plate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-extrabold text-lime-400">
                              <Truck size={13} />
                              {activeTrip.plate}
                            </span>
                            <p className="text-[10px] text-emerald-200/90 font-medium">
                              {db.vehicles.find((v) => v.plate === activeTrip.plate)?.type || 'Armada Operasional'}
                            </p>
                          </div>
                        ) : d.defaultPlate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-200 font-bold font-mono">
                              <Truck size={13} className="text-lime-400" />
                              {d.defaultPlate}
                            </span>
                            <p className="text-[10px] text-emerald-300/80">
                              {db.vehicles.find((v) => v.plate === d.defaultPlate)?.type || 'Mobil Default'}
                              {db.vehicles.find((v) => v.plate === d.defaultPlate)?.dedicatedUser
                                ? ` · User: ${db.vehicles.find((v) => v.plate === d.defaultPlate)?.dedicatedUser}`
                                : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-emerald-400/60 text-[11px] italic">Fleksibel / Pool Bebas</span>
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
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-[#a5700b] bg-[#fff1d6] px-2 py-0.5 rounded font-medium inline-block">
                              Izin / Cuti
                            </span>
                            {d.leaveReplacementName && (
                              <p className="text-[10px] text-[#708078]">
                                Pengganti: <strong className="text-white">{d.leaveReplacementName}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#93a097]">Siap ditugaskan</span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="space-y-0.5 text-[11px]">
                          {d.phone && (
                            <p className="flex items-center gap-1 text-emerald-200">
                              <Phone size={11} className="text-lime-400" />
                              {d.phone}
                            </p>
                          )}
                          {d.simType && (
                            <p className="flex items-center gap-1 text-emerald-300/90 font-medium">
                              <Shield size={11} className="text-lime-400" />
                              {d.simType}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Ajukan Lembur Khusus Admin */}
                          <button
                            type="button"
                            onClick={() => handleOpenOvertime(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/20 px-2.5 py-1 text-[11px] font-bold text-purple-200 shadow-xs hover:bg-purple-500/30 transition"
                            title="Ajukan Lembur (Overtime)"
                          >
                            <Timer size={12} className="text-purple-300" />
                            Lembur
                          </button>

                          {/* Tombol Cuti & Pengganti */}
                          <button
                            type="button"
                            onClick={() => handleOpenLeaveModal(d)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition shadow-xs ${
                              d.onLeave
                                ? 'border-amber-400/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                : 'border-white/10 bg-white/5 text-[#8fa99b] hover:text-white hover:bg-white/10'
                            }`}
                            title="Atur Cuti & Sopir Pengganti"
                          >
                            {d.onLeave ? 'Cuti' : 'Izin'}
                          </button>

                          <button
                            onClick={() => openEditModal(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#dce7df] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10251c] shadow-xs hover:border-[#075b3d] hover:bg-[#f2f8f4] hover:text-[#075b3d] transition"
                          >
                            <Edit3 size={12} className="text-[#075b3d]" />
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

        {/* Pagination Bar */}
        {filteredDrivers.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] bg-[#f8faf9] px-5 py-3">
            <div className="text-[11px] font-medium text-[#62736b]">
              Halaman <span className="font-bold text-[#10251c]">{currentPage}</span> dari {totalPages} (Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDrivers.length)} dari {filteredDrivers.length} sopir)
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

      {/* Modal Tambah / Edit Sopir */}
      {showModal && (
        <ModalPortal
          onClose={() => {
            setShowModal(false)
            setEditingDriver(null)
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#dce7df] max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-1">
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

              <div>
                <label className="text-xs font-semibold text-[#10251c]">
                  Alokasi Armada Default (Aturan Tetap: 1 Driver 1 Kendaraan)
                </label>
                <input
                  list="registered-plates"
                  placeholder="Pilih atau ketik No. Pol (misal: W 1318 TI)"
                  value={formData.defaultPlate}
                  onChange={(e) => setFormData({ ...formData, defaultPlate: e.target.value.toUpperCase() })}
                  className={inputCls}
                />
                <datalist id="registered-plates">
                  {db.vehicles.map((v) => (
                    <option key={v.plate} value={v.plate}>
                      {v.type} ({v.plate}) {v.dedicatedUser ? `[${v.dedicatedUser}]` : ''}
                    </option>
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-[#62736b]">
                  *Jadwal jam kerja penugasan fleksibel mengikuti pengaturan pemetaan admin.
                </p>
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
        </ModalPortal>
      )}

      {/* POP-UP REQUEST OVERTIME (LEMBUR) - FORM UI UNGU */}
      {overtimeDriver && (
        <ModalPortal onClose={() => setOvertimeDriver(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#1e1333] text-white shadow-2xl border border-purple-500/30 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Form Ungu */}
            <div className="flex items-center justify-between border-b border-purple-500/20 bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  <Timer size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pengajuan Overtime (Lembur)</h3>
                  <p className="text-[11px] text-purple-200">Sopir: <strong className="text-white underline">{overtimeDriver.name}</strong> ({overtimeDriver.id})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeDriver(null)}
                className="p-1 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleOvertimeSubmit} className="p-6 space-y-4">
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/40 p-3 text-xs space-y-1.5 text-purple-200">
                <p className="flex items-center gap-1.5 font-semibold text-purple-300">
                  <AlertCircle size={14} className="text-purple-400 shrink-0" />
                  Alur Persetujuan Lembur:
                </p>
                <p className="text-[11px] text-purple-200/80 leading-relaxed">
                  Permohonan lembur ini langsung dikirimkan ke akun <strong>Pak Hayu</strong> (Approver Kendaraan Tahap 2). Setelah di-ACC, driver akan otomatis berstatus <strong>Overtime</strong> disertai timer countdown di HP.
                </p>
              </div>

              {/* Start OT & End OT Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                    Start OT <span className="text-purple-400">*Wajib</span>
                  </label>
                  <input
                    type="time"
                    value={otForm.startOT}
                    onChange={(e) => setOtForm({ ...otForm, startOT: e.target.value })}
                    className="w-full rounded-xl border border-purple-500/30 bg-black/40 px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                    End OT <span className="text-purple-400">*Wajib</span>
                  </label>
                  <input
                    type="time"
                    value={otForm.endOT}
                    onChange={(e) => setOtForm({ ...otForm, endOT: e.target.value })}
                    className="w-full rounded-xl border border-purple-500/30 bg-black/40 px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    required
                  />
                </div>
              </div>

              {/* Alasan Wajib */}
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                  Alasan Lembur <span className="text-purple-400">*Wajib Diisi</span>
                </label>
                <textarea
                  rows={3}
                  value={otForm.reason}
                  onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                  placeholder="Contoh: Mengantar tamu manajemen meeting malam / operasional mendesak logistik..."
                  className="w-full rounded-xl border border-purple-500/30 bg-black/40 p-3 text-xs text-white placeholder-purple-300/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-500/20">
                <button
                  type="button"
                  onClick={() => setOvertimeDriver(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition"
                >
                  <Timer size={14} />
                  Kirim ke Pak Hayu
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* POP-UP STATUS CUTI & PENGGANTIAN NAMA SEMENTARA */}
      {leaveModalDriver && (
        <ModalPortal onClose={() => setLeaveModalDriver(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#f7faf8] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10251c]">
                    {leaveModalDriver.onLeave ? 'Akhiri Status Cuti' : 'Pengaturan Cuti & Sopir Pengganti'}
                  </h3>
                  <p className="text-[11px] text-[#708078]">Sopir: {leaveModalDriver.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalDriver(null)}
                className="p-1 rounded-lg text-[#708078] hover:bg-[#edf2ef]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmLeave} className="p-6 space-y-4">
              {!leaveModalDriver.onLeave ? (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      Aturan Cuti & Beban Kerja:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                      <li>Perjalanan dengan sopir pengganti <strong>tidak diakumulasikan</strong> ke data beban kerja sopir utama maupun pengganti.</li>
                      <li>Perhitungan KM dan durasi fisik mobil <strong>tetap berjalan normal</strong> ke beban kerja kendaraan.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#10251c] mb-1">
                      Nama Sopir Pengganti Sementara (Label Nama Saja)
                    </label>
                    <input
                      type="text"
                      value={leaveReplacementName}
                      onChange={(e) => setLeaveReplacementName(e.target.value)}
                      placeholder="Contoh: Pak Joko (Cadangan) / Pak Rudi"
                      className={inputCls}
                    />
                    <p className="mt-1 text-[10px] text-[#708078]">
                      *Sifatnya hanya mengganti label nama pada jadwal & kendaraan selama cuti.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#10251c]">
                  Apakah Anda ingin mengembalikan status sopir <strong>{leaveModalDriver.name}</strong> menjadi <strong>Aktif Bekerja</strong> dan menghapus penugasan sopir pengganti sementara?
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setLeaveModalDriver(null)}
                  className={btnGhost}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={leaveModalDriver.onLeave ? btnPrimary : 'rounded-full bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 transition'}
                >
                  {leaveModalDriver.onLeave ? 'Aktifkan Kembali' : 'Konfirmasi Cuti & Pengganti'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </>
  )
}


