'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Building,
  CheckCircle,
  Mail,
  MapPin,
  Plus,
  Send,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react'
import { DEPARTMENTS, DEPARTMENT_APPROVERS, type Account } from '@/lib/accounts'
import {
  COUPON_LABEL,
  STATUS_LABEL,
  fmtDate,
  fmtDur,
  fmtTime,
  useStore,
  type Category,
  type CouponStatus,
  type Passenger,
  type Trip,
} from '@/lib/store'
import {
  Card,
  Empty,
  PageHeader,
  Pill,
  btnGhost,
  btnPrimary,
  couponTone,
  inputCls,
  tdCls,
  thCls,
  tripTone,
  useToast,
} from '../ui-bits'
import { DestinationAutocomplete } from '../destination-autocomplete'

// Kategori perjalanan resmi (Izin Keluar Lokasi Pabrik resmi dihilangkan)
const CATS: Category[] = ['Dinas', 'Non-Dinas']

export function RequesterForm({ user }: { user: Account }) {
  const { db, createTrip } = useStore()
  const notify = useToast()

  // Kapasitas maksimum kendaraan dari master fleet (default 7 kursi jika belum diset)
  const maxVehicleCapacity = Math.max(7, ...db.vehicles.map((v) => v.capacity || 7))

  // State departemen pemohon
  const initialDept = user.dept && DEPARTMENTS.includes(user.dept) ? user.dept : 'Procurement'
  const initialApprovers = DEPARTMENT_APPROVERS[initialDept] || []

  const [f, setF] = useState({
    category: 'Dinas' as Category,
    requesterName: user.name || '',
    requesterNik: user.nik || 'JAI-2018042',
    dept: initialDept,
    approvedBy: initialApprovers[0] || '',
    driverOnly: false, // Opsi "Hanya Driver" (tanpa penumpang / antar barang)
    additionalUsers: [] as Passenger[], // User tambahan yang bertambah saat klik "+ Tambah"
    destination: '',
    destinations: [''] as string[],
    purpose: '',
    estDeparture: '08:00',
    estReturn: '12:00',
    distance_km: undefined as number | undefined,
    estimated_duration_minutes: undefined as number | undefined,
  })

  // Total user dalam perjalanan: jika driverOnly = 0 penumpang, jika tidak = 1 + additionalUsers
  const totalUserCount = f.driverOnly ? 0 : 1 + f.additionalUsers.length

  const handleDeptChange = (newDept: string) => {
    const approvers = DEPARTMENT_APPROVERS[newDept] || []
    setF((prev) => ({
      ...prev,
      dept: newDept,
      approvedBy: approvers[0] || '',
    }))
  }

  // Tambah baris user baru (hanya Nama, NIK, dan Departemen - TANPA Approve By)
  const handleAddUser = () => {
    if (totalUserCount >= maxVehicleCapacity) {
      notify(`Maksimal kapasitas kendaraan (${maxVehicleCapacity} orang) telah tercapai!`)
      return
    }

    setF((prev) => ({
      ...prev,
      additionalUsers: [
        ...prev.additionalUsers,
        { name: '', nik: '', dept: prev.dept },
      ],
    }))
  }

  // Update nilai baris user tambahan
  const handleUpdateAdditionalUser = (index: number, field: keyof Passenger, value: string) => {
    setF((prev) => ({
      ...prev,
      additionalUsers: prev.additionalUsers.map((u, idx) =>
        idx === index ? { ...u, [field]: value } : u
      ),
    }))
  }

  // Hapus baris user tambahan
  const handleRemoveAdditionalUser = (index: number) => {
    setF((prev) => ({
      ...prev,
      additionalUsers: prev.additionalUsers.filter((_, i) => i !== index),
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!f.requesterName.trim()) {
      notify('Nama Pemohon wajib diisi!')
      return
    }
    if (!f.requesterNik.trim()) {
      notify('NIK Pemohon wajib diisi!')
      return
    }
    if (!f.destination.trim()) {
      notify('Tujuan lokasi wajib diisi!')
      return
    }

    // Gabungkan pemohon utama dengan user tambahan jika bukan driverOnly
    const allPassengers: Passenger[] = f.driverOnly
      ? []
      : [
          { name: f.requesterName.trim(), nik: f.requesterNik.trim(), dept: f.dept },
          ...f.additionalUsers.filter((u) => u.name.trim()),
        ]

    const guestLabel = f.driverOnly
      ? `Hanya Driver (Kirim Barang / Dokumen oleh ${f.requesterName.trim()})`
      : f.requesterName.trim()

    createTrip({
      category: f.category,
      guest: guestLabel,
      requesterNik: f.requesterNik.trim(),
      dept: f.dept,
      spvName: f.approvedBy || `Approver (${f.dept})`,
      passengers: allPassengers,
      driverOnly: f.driverOnly,
      destination: f.destination,
      destinations: f.destinations.filter(Boolean),
      purpose: f.purpose,
      estDeparture: f.estDeparture,
      estReturn: f.estReturn,
      distance_km: f.distance_km,
      estimated_duration_minutes: f.estimated_duration_minutes,
      requesterUser: user.username,
      requesterName: f.requesterName.trim(),
    })

    notify(
      f.driverOnly
        ? `Terkirim (Hanya Driver - Hak Kupon Hangus). E-sign dikirim ke ${f.approvedBy}.`
        : `Terkirim. Pengajuan diajukan ke ${f.approvedBy} (${f.dept}) untuk E-Sign.`
    )

    const resetApprovers = DEPARTMENT_APPROVERS[initialDept] || []
    setF({
      category: 'Dinas',
      requesterName: user.name || '',
      requesterNik: user.nik || 'JAI-2018042',
      dept: initialDept,
      approvedBy: resetApprovers[0] || '',
      driverOnly: false,
      additionalUsers: [],
      destination: '',
      destinations: [''],
      purpose: '',
      estDeparture: '08:00',
      estReturn: '12:00',
      distance_km: undefined,
      estimated_duration_minutes: undefined,
    })
  }

  const mine = db.trips.filter((t) => t.requesterUser === user.username).slice().reverse()
  const currentApproverList = DEPARTMENT_APPROVERS[f.dept] || []

  // Sub menu navigasi atas: 'form' (Formulir Permohonan) atau 'history' (Riwayat Pengajuan)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')

  return (
    <>
      <PageHeader
        title="Ajukan Kendaraan"
        desc="Pengajuan permohonan perjalanan pool armada pabrik PT. JAI dengan approval berjenjang."
        action={
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/40 border border-white/10 p-1.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'form'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-md shadow-[#a3e635]/25 scale-[1.02]'
                  : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={15} />
              Formulir Pengajuan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-md shadow-[#a3e635]/25 scale-[1.02]'
                  : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={15} />
              Riwayat Pengajuan
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                  activeTab === 'history'
                    ? 'bg-[#052e16] text-[#bef264]'
                    : 'bg-white/10 text-white'
                }`}
              >
                {mine.length}
              </span>
            </button>
          </div>
        }
      />

      {activeTab === 'form' && (
        <Card
          title="Formulir Permohonan Perjalanan"
          subtitle="Isi rincian keperluan perjalanan dinas & operasional PT. JAI (Tampilan Penuh)"
        >
          <form onSubmit={submit} className="grid gap-4.5 p-6">
            {/* 1. Kategori / Pilihan Keperluan (Hanya Dinas & Non-Dinas) */}
            <div>
              <p className="text-xs font-semibold text-[#8fa99b]">Kategori / Jenis Perjalanan</p>
              <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
                {CATS.map((c, i) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setF({ ...f, category: c })}
                    className={`rounded-xl border px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      f.category === c
                        ? 'border-[#a3e635] bg-[#a3e635]/20 text-white ring-1 ring-[#a3e635]/40 shadow-xs'
                        : 'border-[#a3e635]/20 bg-white/[0.03] text-[#8fa99b] hover:bg-[#a3e635]/10'
                    }`}
                  >
                    <span className="size-2 rounded-full bg-[#a3e635]" />
                    {i + 1}. {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pengisian Data Pemohon & Approver */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User size={14} className="text-[#a3e635]" /> Data Pemohon
                </p>
                <span className="rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#bef264]">
                  {totalUserCount} / {maxVehicleCapacity} Orang (Termasuk Pemohon)
                </span>
              </div>

              {/* Grid 4 Kolom: Nama, NIK, Departemen, Approved By */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Nama Pemohon <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    value={f.requesterName}
                    onChange={(e) => setF({ ...f, requesterName: e.target.value })}
                    placeholder="Nama Lengkap"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    NIK Pemohon <span className="text-[#a3e635]">*Wajib</span>
                  </label>
                  <input
                    value={f.requesterNik}
                    onChange={(e) => setF({ ...f, requesterNik: e.target.value })}
                    placeholder="Nomor Induk Karyawan"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Departemen <span className="text-[#a3e635]">*Pilih</span>
                  </label>
                  <select
                    value={f.dept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className={`${inputCls} bg-black/40`}
                    required
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#0f1f17] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Approved By <span className="text-[#a3e635]">*Otomatis</span>
                  </label>
                  <select
                    value={f.approvedBy}
                    onChange={(e) => setF({ ...f, approvedBy: e.target.value })}
                    className={`${inputCls} bg-black/40`}
                    required
                  >
                    {currentApproverList.map((appr) => (
                      <option key={appr} value={appr} className="bg-[#0f1f17] text-white">
                        {appr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opsi "Hanya Driver" (Kirim Barang / Dokumen tanpa penumpang) */}
              <div
                className={`rounded-xl border p-3.5 transition ${
                  f.driverOnly
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/30'
                    : 'border-white/10 bg-white/[0.02] text-[#8fa99b] hover:bg-white/[0.04]'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={f.driverOnly}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setF((prev) => ({
                        ...prev,
                        driverOnly: checked,
                        // Kosongkan user tambahan jika beralih ke hanya driver
                        additionalUsers: checked ? [] : prev.additionalUsers,
                      }))
                    }}
                    className="mt-0.5 size-4 rounded border-white/20 bg-black/40 text-[#a3e635] accent-[#a3e635] focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Opsi "Hanya Driver" (Tanpa Penumpang)
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                          f.driverOnly
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-white/10 text-[#8fa99b]'
                        }`}
                      >
                        {f.driverOnly ? 'Kupon Makan VOID / Hangus' : 'Kupon Normal'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#93a097]">
                      Centang jika hanya menugaskan sopir untuk mengambil / mengirim dokumen atau barang logistik pabrik tanpa ada karyawan/tamu yang ikut.
                    </p>
                    {f.driverOnly && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200">
                        <AlertCircle size={14} className="shrink-0 text-amber-300" />
                        <span>
                          <strong>Konsekuensi Sistem:</strong> Hak klaim kupon makan siang driver untuk pengajuan ini <strong>otomatis dinonaktifkan (VOID / Hangus)</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* User Tambahan (Hanya muncul jika BUKAN "Hanya Driver") */}
              {!f.driverOnly && f.additionalUsers.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <p className="text-[11px] font-bold text-[#bef264] flex items-center gap-1.5">
                    <Users size={13} className="text-[#a3e635]" /> User / Penumpang Tambahan ({f.additionalUsers.length})
                  </p>

                  <div className="space-y-2.5">
                    {f.additionalUsers.map((u, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2 transition hover:border-white/15"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#bef264]">
                            <span className="flex size-4.5 items-center justify-center rounded-full bg-[#a3e635]/20 text-[9px] text-[#bef264]">
                              +{idx + 1}
                            </span>
                            User Tambahan {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalUser(idx)}
                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>

                        {/* Hanya Nama, NIK, dan Departemen (TIDAK ADA APPROVE BY) */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              Nama Lengkap <span className="text-[#a3e635]">*</span>
                            </label>
                            <input
                              type="text"
                              value={u.name}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'name', e.target.value)}
                              placeholder="Nama rekan kerja"
                              className={inputCls}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              NIK <span className="text-[#a3e635]">*</span>
                            </label>
                            <input
                              type="text"
                              value={u.nik || ''}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'nik', e.target.value)}
                              placeholder="NIK rekan kerja"
                              className={`${inputCls} font-mono`}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              Departemen <span className="text-[#a3e635]">*</span>
                            </label>
                            <select
                              value={u.dept}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'dept', e.target.value)}
                              className={`${inputCls} bg-black/40`}
                              required
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d} className="bg-[#0f1f17] text-white">
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Tambah User (Dinonaktifkan jika mode Hanya Driver) */}
              {!f.driverOnly && totalUserCount < maxVehicleCapacity && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddUser}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#a3e635]/40 bg-[#a3e635]/5 px-3.5 py-2 text-xs font-bold text-[#bef264] hover:bg-[#a3e635]/15 hover:border-[#a3e635] transition"
                  >
                    <Plus size={14} />
                    Tambah Rekan / User ({totalUserCount + 1}/{maxVehicleCapacity})
                  </button>
                </div>
              )}
            </div>

            {/* 5. Fitur Rute Multi-Drop & Integrasi Peta PT. JAI */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8fa99b]">
                Rute Perjalanan (Multi-Drop)
              </label>
              <DestinationAutocomplete
                value={f.destination}
                destinations={f.destinations}
                distanceKm={f.distance_km}
                durationMins={f.estimated_duration_minutes}
                onChange={(data) => {
                  setF((prev) => ({
                    ...prev,
                    destination: data.destination,
                    destinations: data.destinations,
                    distance_km: data.distance_km,
                    estimated_duration_minutes: data.estimated_duration_minutes,
                  }))
                }}
              />
            </div>

            {/* 6. Keperluan / Alasan Kunjungan */}
            <label className="text-xs font-semibold text-[#8fa99b]">
              Keperluan / Alasan Kunjungan
              <input
                value={f.purpose}
                onChange={(e) => setF({ ...f, purpose: e.target.value })}
                placeholder="Contoh: Survey vendor / Pengiriman sampel part pabrik"
                className={inputCls}
                required
              />
            </label>

            {/* 7. Estimasi Jam Berangkat & Estimasi Jam Kembali */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#8fa99b]">
                Estimasi Jam Berangkat
                <input
                  type="time"
                  value={f.estDeparture}
                  onChange={(e) => setF({ ...f, estDeparture: e.target.value })}
                  className={inputCls}
                  required
                />
              </label>

              <label className="text-xs font-semibold text-[#8fa99b]">
                Estimasi Jam Kembali
                <input
                  type="time"
                  value={f.estReturn}
                  onChange={(e) => setF({ ...f, estReturn: e.target.value })}
                  className={inputCls}
                  required
                />
              </label>
            </div>

            <button id="submit-request" className={`${btnPrimary} mt-2 w-full py-3.5 text-xs`}>
              <Plus size={16} />
              Kirim Permohonan Perjalanan
            </button>
          </form>
        </Card>
      )}

      {/* Riwayat Pengajuan (Full Width saat Tab Riwayat Aktif) */}
      {activeTab === 'history' && (
        <Card
          title="Riwayat Pengajuan Saya"
          subtitle={`Daftar seluruh riwayat pengajuan kendaraan dinas · Departemen ${user.dept || f.dept}`}
          action={
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`${btnPrimary} !py-1.5 !px-3 text-xs`}
            >
              <Plus size={14} /> Buat Pengajuan Baru
            </button>
          }
        >
          {mine.length === 0 ? (
            <Empty text="Belum ada permohonan perjalanan yang diajukan." />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {mine.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4.5 text-xs hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white text-[14px]">{t.destination}</p>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#a3e635]">
                        {t.dept}
                      </span>
                      {t.distance_km && (
                        <span className="rounded-md bg-[#a3e635]/15 border border-[#a3e635]/30 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">
                          {t.distance_km} KM PP
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#93a097]">
                      {t.id} · {t.category} · {fmtDate(t.date)} · Jam {t.estDeparture}
                      {t.estReturn ? ` – ${t.estReturn}` : ''} WIB · Pemohon: {t.guest}
                      {t.estimated_duration_minutes && ` · Est. ~${t.estimated_duration_minutes} mnt`}
                    </p>

                    {/* Penumpang & Approver info */}
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-[#8fa99b]">
                      <span>Approver: <strong className="text-white">{t.spvName}</strong></span>
                      {t.requesterNik && <span>· NIK: <span className="font-mono text-white">{t.requesterNik}</span></span>}
                      {t.driverOnly ? (
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-300 font-semibold">
                          📦 Hanya Driver (Kupon Hangus / VOID)
                        </span>
                      ) : t.passengers && t.passengers.length > 0 ? (
                        <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[#bef264]">
                          +{t.passengers.length} Penumpang ({t.passengers.map((p) => `${p.name} [${p.dept}]`).join(', ')})
                        </span>
                      ) : null}
                    </div>

                    {t.driverId && (
                      <p className="text-[11px] text-[#bef264] font-medium">
                        Driver: {db.drivers.find((d) => d.id === t.driverId)?.name} · Plat: {t.plate}
                      </p>
                    )}
                  </div>

                    <div className="flex items-center gap-2">
                      <Pill label={STATUS_LABEL[t.status]} tone={tripTone(t.status)} />
                      {(t.status === 'WAITING_SPV' || t.status === 'WAITING_POOL_SPV') && (
                        <a
                          href={`/approve/${t.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[#b8cfc2] px-3 py-1.5 text-[11px] font-bold text-[#176c4b] hover:bg-[#eef5f0]"
                        >
                          <Mail size={12} />
                          {t.status === 'WAITING_SPV' ? 'E-Sign SPV Dept' : 'E-Sign SPV Kendaraan'}
                        </a>
                      )}
                    </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}

export function RequesterCoupons({ user }: { user: Account }) {
  const { db, claimCoupon } = useStore()
  const notify = useToast()
  const [selectedTicket, setSelectedTicket] = useState<Trip | null>(null)

  // Filter trips for this requester's department that are DONE and coupon is eligible/processed
  const rows = db.trips.filter((t) => t.dept === user.dept && t.status === 'DONE' && t.coupon !== 'NONE')
  const claimable = rows.filter((t) => t.coupon === 'CLAIMABLE')
  const inProgress = rows.filter((t) => t.coupon === 'PR_PENDING' || t.coupon === 'PR_PROGRESS')
  const created = rows.filter((t) => t.coupon === 'PAID')

  return (
    <>
      <PageHeader
        title="Panel Kupon & Pencairan Makan Siang"
        desc="Pelacakan real-time klaim kupon makan siang driver/pemohon · Waktu kembali (Time Back) ≥ 12:00 WIB berhak atas kupon."
      />

      {/* Panel Pelacakan Requester (Summary Card) */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">Siap Diajukan</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {claimable.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{claimable.length} <span className="text-xs font-normal text-[#8fa99b]">Kupon</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Perlu klik tombol &quot;Ajukan Klaim&quot;</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">Proses PR (Finance)</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {inProgress.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300">{inProgress.length} <span className="text-xs font-normal text-[#8fa99b]">Klaim</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Sedang diproses pembuatan PR</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">PR Selesai (Created)</span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
              {created.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-400">{created.length} <span className="text-xs font-normal text-[#8fa99b]">Selesai</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Nomor PR terbit & siap disbursement</p>
        </div>
      </div>

      <Card title="Daftar Kupon & Status Pencairan" subtitle={`${rows.length} total riwayat perjalanan berkupon`}>
        {rows.length === 0 ? (
          <Empty text="Belum ada perjalanan selesai dengan hak kupon makan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f7faf8]">
                <tr>
                  {['Tgl Trip', 'Tujuan', 'Pemohon / NIK', 'Driver', 'Jam Berangkat', 'Jam Kembali', 'Status Kupon', 'Aksi / Detail'].map(
                    (h) => (
                      <th key={h} className={thCls}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const driverName = db.drivers.find((d) => d.id === t.driverId)?.name ?? '—'
                  return (
                    <tr key={t.id} className="border-t border-[#edf1ee]">
                      <td className={tdCls}>{fmtDate(t.date)}</td>
                      <td className={tdCls}>
                        <div className="font-semibold text-white">{t.destination}</div>
                        <div className="text-[10px] text-[#8fa99b] font-mono">{t.id}</div>
                      </td>
                      <td className={tdCls}>
                        <div className="font-medium text-white">{t.requesterName}</div>
                        <div className="text-[10px] text-[#8fa99b] font-mono">NIK: {t.requesterNik || '—'}</div>
                      </td>
                      <td className={tdCls}>{driverName}</td>
                      <td className={tdCls}>{fmtTime(t.timeGo)} WIB</td>
                      <td className={`${tdCls} font-bold text-[#bef264]`}>{fmtTime(t.timeBack)} WIB</td>
                      <td className={tdCls}>
                        <div className="space-y-1">
                          <Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} />
                          {t.prNumber && (
                            <div className="text-[10px] font-mono text-sky-400 font-bold block">
                              PR: {t.prNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          {t.coupon === 'CLAIMABLE' && (
                            <button
                              onClick={() => {
                                claimCoupon(t.id)
                                notify('Klaim diajukan ke Admin Kupon (Status: Belum Dibuat PR)')
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition"
                            >
                              <Send size={11} />
                              Ajukan Klaim
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTicket(t)}
                            className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 text-[11px] font-semibold transition"
                          >
                            Lihat Tiket
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

      {/* Modal Detail Tiket Kupon (Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 text-white shadow-2xl space-y-5">
            {/* Header Tiket */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#a3e635] px-2 py-0.5 text-[10px] font-extrabold text-[#052e16]">
                    TIKET KUPON MAKAN
                  </span>
                  <span className="text-xs font-mono text-[#8fa99b]">{selectedTicket.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">PT. JAI Kupon Elektronik</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-full bg-white/10 p-1 text-[#8fa99b] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Informasi Detail Wajib: Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Nama Pemohon / Tamu:</span>
                <span className="font-bold text-white text-sm">{selectedTicket.requesterName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">NIK Pemohon:</span>
                <span className="font-mono font-bold text-white">{selectedTicket.requesterNik || 'JAI-2018042'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Departemen:</span>
                <span className="font-medium text-white">{selectedTicket.dept}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Tujuan Perjalanan:</span>
                <span className="font-bold text-[#bef264]">{selectedTicket.destination}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Jam Berangkat (Aktual):</span>
                <span className="font-semibold text-white">{fmtTime(selectedTicket.timeGo)} WIB</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Jam Kembali (Aktual):</span>
                <span className="font-bold text-[#bef264] text-sm">{fmtTime(selectedTicket.timeBack)} WIB</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Driver yang Bertugas:</span>
                <span className="font-semibold text-white">
                  {db.drivers.find((d) => d.id === selectedTicket.driverId)?.name ?? '—'} ({selectedTicket.plate ?? '—'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[#8fa99b]">Status Kupon Saat Ini:</span>
                <Pill label={COUPON_LABEL[selectedTicket.coupon]} tone={couponTone(selectedTicket.coupon)} />
              </div>
              {selectedTicket.prNumber && (
                <div className="mt-2 rounded-lg bg-sky-950/40 border border-sky-500/30 p-2.5">
                  <div className="text-[10px] text-sky-300 font-semibold uppercase">Nomor Purchase Request (PR):</div>
                  <div className="text-base font-black font-mono text-sky-400">{selectedTicket.prNumber}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Dibuat oleh: {selectedTicket.prCreatedBy || selectedTicket.paidBy || 'Finance'} • {selectedTicket.prCreatedAt ? fmtDate(selectedTicket.prCreatedAt.slice(0, 10)) : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition"
              >
                Tutup Tiket
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
