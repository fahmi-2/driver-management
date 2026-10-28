'use client'

import { useState, useMemo } from 'react'
import { TripRouteToggle } from '../route-map'
import {
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  Lock,
  MailCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
  XCircle,
  AlertCircle,
  Timer,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Sparkles,
  Ban,
  CheckCircle,
  X,
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useStore, type Trip, type OvertimeRequest, fmtDate, fmtTime, STATUS_LABEL } from '@/lib/store'
import { Card, PageHeader, Pill, btnPrimary, btnGhost, tripTone, useToast } from '../ui-bits'

type StatusFilterType = 'ALL' | 'NEW' | 'SUCCESS' | 'CANCEL'

export function ApproverInbox({ user }: { user: Account }) {
  const { db, spvDecision, poolSpvDecision, approveOvertime, rejectOvertime, approveOvertimeReport } = useStore()
  const notify = useToast()

  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'overtime'>('pending')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [decisionModal, setDecisionModal] = useState<{
    trip: Trip
    type: 'dept' | 'pool'
    action: 'approve' | 'reject'
  } | null>(null)
  const [note, setNote] = useState('')

  // Cek apakah user adalah SPV Kendaraan (Pool GA / HR & GA)
  const isPoolSpv = user.role === 'approver_pool' || user.username === 'spv_pool' || user.dept === 'HR & GA'

  // Filter trips sesuai hak akses Approver:
  // 1. SPV Departemen: meninjau trip milik departemennya yang berstatus WAITING_SPV (Tahap 1)
  // 2. SPV Kendaraan: meninjau trip yang sudah dijadwalkan oleh admin dan berstatus WAITING_POOL_SPV (Tahap 2)
  const allTrips = db.trips.slice().reverse()

  // Deduplikasi trips berdasarkan ID: pastikan data terbaru yang tampil (jika ada trip dengan id sama)
  const uniqueAllTrips = useMemo(() => {
    const map = new Map<string, Trip>()
    for (const t of allTrips) {
      if (!map.has(t.id)) {
        map.set(t.id, t)
      }
    }
    return Array.from(map.values())
  }, [allTrips])

  const pendingTrips = useMemo(() => {
    return uniqueAllTrips.filter((t) => {
      const userEmail = user.email?.trim().toLowerCase()
      const userName = user.name?.trim().toUpperCase()
      const isTargetedApprover = (userEmail && (t.approverEmail?.toLowerCase() === userEmail || t.spvEmail?.toLowerCase() === userEmail)) ||
        (userName && t.spvName && t.spvName.toUpperCase().includes(userName))

      if (isPoolSpv) {
        return t.status === 'WAITING_POOL_SPV' || t.status === 'WAITING_SPV'
      }
      return (
        (t.status === 'WAITING_SPV' && (t.dept === user.dept || isTargetedApprover)) ||
        (t.status === 'WAITING_POOL_SPV' && !t.poolSpvAt && (t.dept === user.dept || isTargetedApprover))
      )
    })
  }, [uniqueAllTrips, isPoolSpv, user])

  const historyTrips = useMemo(() => {
    return uniqueAllTrips.filter((t) => {
      const userEmail = user.email?.trim().toLowerCase()
      const userName = user.name?.trim().toUpperCase()
      const isTargetedApprover = (userEmail && (t.approverEmail?.toLowerCase() === userEmail || t.spvEmail?.toLowerCase() === userEmail)) ||
        (userName && t.spvName && t.spvName.toUpperCase().includes(userName))

      if (isPoolSpv) {
        return Boolean(t.poolSpvAt || t.spvAt)
      }
      return (t.dept === user.dept || isTargetedApprover) && (t.spvAt || t.status === 'DONE' || t.status === 'READY')
    })
  }, [uniqueAllTrips, isPoolSpv, user])

  // Overtime Requests untuk Pak Hayu (Approver Kendaraan Tahap 2)
  const allOts = (db.overtimeRequests || []).slice().reverse()
  const pendingOts = allOts.filter((ot) => ot.status === 'PENDING' || ot.status === 'WAITING_REPORT')
  const historyOts = allOts.filter((ot) => ot.status === 'COMPLETED' || ot.status === 'REJECTED' || ot.status === 'APPROVED')

  const baseList = activeTab === 'pending' ? pendingTrips : historyTrips

  // Filter berdasarkan kelas notifikasi:
  // NEW: Baru Masuk / Menunggu Tinjauan (WAITING_SPV, WAITING_POOL_SPV, WAITING_ASSIGN)
  // SUCCESS: Berhasil / Disetujui (READY, ON_TRIP, DONE, atau trip yang sudah di-spvAt / poolSpvAt)
  // CANCEL: Batal / Ditolak (REJECTED)
  const categoryFilteredTrips = useMemo(() => {
    return baseList.filter((t) => {
      if (statusFilter === 'NEW') {
        return t.status === 'WAITING_SPV' || t.status === 'WAITING_POOL_SPV' || t.status === 'WAITING_ASSIGN'
      }
      if (statusFilter === 'SUCCESS') {
        return t.status === 'READY' || t.status === 'ON_TRIP' || t.status === 'DONE' || (!['REJECTED', 'WAITING_SPV', 'WAITING_POOL_SPV'].includes(t.status))
      }
      if (statusFilter === 'CANCEL') {
        return t.status === 'REJECTED'
      }
      return true
    })
  }, [baseList, statusFilter])

  const filteredTrips = useMemo(() => {
    return categoryFilteredTrips.filter((t) => {
      const q = search.toLowerCase()
      return (
        t.destination.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        t.guest.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    })
  }, [categoryFilteredTrips, search])

  // Hitung total pages dan batas row (10 baris per halaman)
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pagedTrips = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredTrips.slice(start, start + pageSize)
  }, [filteredTrips, safeCurrentPage, pageSize])

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!decisionModal) return

    const { trip, type, action } = decisionModal
    const isApprove = action === 'approve'

    if (!isApprove && !note.trim()) {
      alert('Alasan penolakan wajib diisi!')
      return
    }

    if (type === 'dept') {
      spvDecision(trip.id, isApprove, note.trim())
      notify(
        isApprove
          ? `Pengajuan ${trip.id} berhasil disetujui (Tahap 1: SPV Dept). Sekarang siap dijadwalkan oleh Admin Utama.`
          : `Pengajuan ${trip.id} berhasil ditolak.`
      )
    } else {
      poolSpvDecision(trip.id, isApprove, note.trim(), user.name)
      notify(
        isApprove
          ? `Pengajuan ${trip.id} berhasil di-ACC Final oleh SPV Kendaraan! Jadwal resmi masuk ke dasbor Driver (Siap Berangkat).`
          : `Pengajuan ${trip.id} berhasil ditolak oleh SPV Kendaraan.`
      )
    }

    setDecisionModal(null)
    setNote('')
  }

  return (
    <>
      <PageHeader
        title="Inbox & Persetujuan Approver (E-Sign)"
        desc={`Tinjau dan berikan persetujuan berjenjang permohonan kendaraan · Login sebagai ${user.name} (${user.title})`}
        action={
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/40 border border-white/10 p-1.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-md shadow-[#a3e635]/25 scale-[1.02]'
                  : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
              }`}
            >
              <Inbox size={15} />
              Menunggu Tinjauan (Pending)
              {pendingTrips.length > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">
                  {pendingTrips.length}
                </span>
              )}
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
              <CheckCircle2 size={15} />
              Riwayat Putusan ({historyTrips.length})
            </button>
            {isPoolSpv && (
              <button
                type="button"
                onClick={() => setActiveTab('overtime')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'overtime'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                    : 'text-purple-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Timer size={15} />
                Approval Overtime
                {pendingOts.length > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">
                    {pendingOts.length}
                  </span>
                )}
              </button>
            )}
          </div>
        }
      />

      {/* Role Banner Info */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-[#062417] p-4 text-xs text-[#d1fae5] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#a3e635] text-[#052e16] font-bold">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-[13px]">{user.name}</span>
              <span className="rounded bg-[#a3e635]/20 text-[#bef264] px-2 py-0.5 text-[10px] font-extrabold border border-[#a3e635]/30">
                {isPoolSpv ? 'Otoritas: SPV Kendaraan (Tahap 1 & 2 Double Job)' : `Otoritas: SPV ${user.dept} (Tahap 1)`}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#93a097]">
              {isPoolSpv
                ? 'Dapat menyetujui E-Sign Tahap 1 (Departemen/Double Job) dan ACC Final Tahap 2 (Alokasi Armada & Driver).'
                : `Memvalidasi permohonan dinas karyawan di lingkungan departemen ${user.dept}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-[#bef264]">
          <span className="font-bold">{pendingTrips.length} Pengajuan</span> memerlukan tindakan E-Sign Anda.
        </div>
      </div>

      {activeTab === 'overtime' ? (
        <Card
          title="Permohonan Overtime (Lembur) Driver & Laporan Penangguhan"
          subtitle={`Daftar pengajuan lembur dari Admin dan validasi laporan jam aktual (${pendingOts.length} menunggu tindakan)`}
        >
          {allOts.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#9aa7a0]">
              Belum ada data pengajuan lembur driver.
            </div>
          ) : (
            <div className="divide-y divide-[#edf1ee]">
              {allOts.map((ot) => (
                <div key={ot.id} className="p-5 transition hover:bg-purple-500/5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          {ot.id}
                        </span>
                        <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-bold text-[#10251c]">
                          Driver: {ot.driverName}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                          ot.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : ot.status === 'APPROVED' || ot.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ot.status === 'WAITING_REPORT'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : ot.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {ot.status === 'PENDING'
                            ? 'Menunggu Approval Pak Hayu'
                            : ot.status === 'APPROVED' || ot.status === 'ACTIVE'
                            ? 'Overtime Berjalan'
                            : ot.status === 'WAITING_REPORT'
                            ? 'Ditangguhkan (Menunggu Validasi Laporan Driver)'
                            : ot.status === 'COMPLETED'
                            ? 'Selesai / Normal'
                            : 'Ditolak'}
                        </span>
                      </div>

                      <div className="text-xs text-[#10251c] pt-1">
                        <p><strong>Rencana Jam Lembur:</strong> {ot.startOT} – {ot.endOT} WIB ({ot.date})</p>
                        <p className="mt-0.5 text-[#708078]"><strong>Alasan Lembur:</strong> {ot.reason}</p>
                        <p className="text-[10px] text-[#93a097]">Diajukan oleh: {ot.requestedByName} ({ot.requestedBy})</p>
                      </div>

                      {/* Laporan Penangguhan dari Driver jika selisih > 15 Menit */}
                      {ot.driverReport && (
                        <div className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-rose-700">
                            <AlertCircle size={14} /> Laporan Alasan Ketidaksesuaian Jam dari Driver:
                          </p>
                          <p className="text-[11px] font-medium text-rose-900 bg-white/80 p-2 rounded border border-rose-200">
                            "{ot.driverReport}"
                          </p>
                          <p className="text-[10px] text-rose-600">
                            *Jam aktual selesai: {ot.actualEnd ? fmtTime(ot.actualEnd) : '-'} WIB. Hitungan lembur telah terhenti otomatis. Menyetujui laporan ini akan mengembalikan status driver & mobil menjadi Normal/Tersedia.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {ot.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              rejectOvertime(ot.id)
                              notify(`Lembur ${ot.driverName} ditolak.`)
                            }}
                            className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            <XCircle size={13} />
                            Tolak
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              approveOvertime(ot.id, user.name)
                              notify(`Lembur ${ot.driverName} disetujui! Status driver aktif menjadi Overtime.`)
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-1.5 text-xs font-bold text-white shadow-md transition"
                          >
                            <CheckCircle2 size={13} />
                            ACC Lembur
                          </button>
                        </div>
                      )}

                      {ot.status === 'WAITING_REPORT' && (
                        <button
                          type="button"
                          onClick={() => {
                            approveOvertimeReport(ot.id)
                            notify(`Laporan ketidaksesuaian lembur ${ot.driverName} disetujui! Status driver dan mobil kembali Normal/Tersedia.`)
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-md transition"
                        >
                          <CheckCircle2 size={13} />
                          Approve Laporan & Kembalikan Status Normal
                        </button>
                      )}

                      {(ot.status === 'COMPLETED' || ot.status === 'APPROVED') && (
                        <span className="text-[10px] text-[#93a097] font-medium">
                          {ot.approvedBy ? `Disetujui oleh: ${ot.approvedBy}` : 'Terverifikasi'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
      <Card
        title={activeTab === 'pending' ? 'Daftar Pengajuan Menunggu ACC' : 'Riwayat Keputusan Approver'}
        subtitle={`Total ${filteredTrips.length} data ditemukan (10 per halaman)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kelas Notifikasi */}
            <div className="flex items-center gap-1 rounded-xl bg-[#0a271a] p-1 border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1) }}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-[#a3e635] text-[#052e16] shadow-sm'
                    : 'text-[#8fa99b] hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('NEW'); setCurrentPage(1) }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                  statusFilter === 'NEW'
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'text-amber-300/80 hover:text-amber-300'
                }`}
              >
                <Sparkles size={11} />
                Baru Masuk
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('SUCCESS'); setCurrentPage(1) }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                  statusFilter === 'SUCCESS'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-emerald-300/80 hover:text-emerald-300'
                }`}
              >
                <CheckCircle size={11} />
                Berhasil
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('CANCEL'); setCurrentPage(1) }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                  statusFilter === 'CANCEL'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-red-300/80 hover:text-red-300'
                }`}
              >
                <Ban size={11} />
                Batal
              </button>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#93a097]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                placeholder="Cari tujuan / pemohon / nomor tiket..."
                className="h-8 w-52 sm:w-60 rounded-lg bg-[#f5f7f5] pl-8 pr-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
              />
            </div>
          </div>
        }
      >
        {filteredTrips.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#9aa7a0]">
            {activeTab === 'pending'
              ? 'Tidak ada pengajuan yang membutuhkan tindakan persetujuan Anda saat ini.'
              : 'Belum ada riwayat persetujuan.'}
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ee]">
            {pagedTrips.map((trip) => {
              const isStage1 = trip.status === 'WAITING_SPV' || (!isPoolSpv && trip.status === 'WAITING_POOL_SPV')
              const isStage2 = trip.status === 'WAITING_POOL_SPV'
              const assignedDriver = db.drivers.find((d) => d.id === trip.driverId)

              return (
                <div key={trip.id} className="p-5 transition hover:bg-lime-400/5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#075b3d] bg-[#eef5f0] px-2 py-0.5 rounded">
                          {trip.id}
                        </span>
                        {/* Tag Keterangan EDITED (Jika pengajuan direvisi agar Approver tahu data terupdate) */}
                        {trip.isEdited && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black text-amber-800 animate-pulse">
                            <FileEdit size={11} className="text-amber-600" />
                            [EDITED] Revisi Terbaru
                          </span>
                        )}
                        {trip.golongan && (
                          <span className="rounded bg-indigo-100 border border-indigo-300 px-2 py-0.5 text-[10px] font-extrabold text-indigo-900">
                            Golongan {trip.golongan} ({trip.approverRole || (trip.golongan === 4 ? 'Manager' : 'SSPV')})
                          </span>
                        )}
                        <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-bold text-[#10251c]">
                          {trip.dept}
                        </span>
                        <span className="rounded bg-[#a3e635]/15 border border-[#a3e635]/30 px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                          {trip.category}
                        </span>
                        {trip.distance_km && (
                          <span className="rounded bg-white border border-[#b8cfc2] px-2 py-0.5 text-[10px] font-semibold text-[#075b3d]">
                            {trip.distance_km} KM PP
                          </span>
                        )}
                        {trip.driverOnly && (
                          <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            📦 Hanya Driver (Kupon Hangus)
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#10251c] flex items-center gap-2">
                        {trip.destination}
                        {trip.isEdited && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Telah Diperbarui
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#708078]">Keperluan: {trip.purpose}</p>

                      <div className="grid gap-1 sm:grid-cols-2 text-[11px] text-[#63726a] pt-1">
                        <div>
                          <strong>Pemohon:</strong> {trip.requesterName} {trip.requesterNik ? `(${trip.requesterNik})` : ''}
                        </div>
                        <div>
                          <strong>Tamu / Penumpang:</strong> {trip.guest}
                          {trip.passengers && trip.passengers.length > 0 && ` (+${trip.passengers.length} org)`}
                        </div>
                        <div>
                          <strong>Jadwal:</strong> {fmtDate(trip.date)} · Jam {trip.estDeparture} {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB
                        </div>
                        {trip.plate && (
                          <div>
                            <strong>Alokasi Armada:</strong> {trip.plate} · Driver: {assignedDriver?.name || 'Belum diatur'}
                          </div>
                        )}
                      </div>

                      <TripRouteToggle trip={trip} tone="light" />
                    </div>

                    {/* Status Pill & Actions */}
                    <div className="flex flex-col items-end gap-2.5">
                      <Pill label={STATUS_LABEL[trip.status]} tone={tripTone(trip.status)} />

                      {activeTab === 'pending' && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setDecisionModal({
                                trip,
                                type: isStage1 ? 'dept' : 'pool',
                                action: 'reject',
                              })
                            }
                            className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            <XCircle size={14} />
                            Tolak
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDecisionModal({
                                trip,
                                type: isStage1 ? 'dept' : 'pool',
                                action: 'approve',
                              })
                            }
                            className="flex items-center gap-1 rounded-xl bg-[#075b3d] px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[#064d33] transition"
                          >
                            <CheckCircle2 size={14} />
                            {isStage1 ? 'ACC SPV Dept (Tahap 1)' : 'ACC Final SPV Kendaraan'}
                          </button>
                        </div>
                      )}

                      {activeTab === 'history' && (
                        <div className="text-right text-[10px] text-[#93a097]">
                          {trip.spvAt && <p>SPV Dept: {trip.spvName} ({fmtTime(trip.spvAt)})</p>}
                          {trip.poolSpvAt && <p>SPV Kendaraan: {trip.poolSpvName} ({fmtTime(trip.poolSpvAt)})</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination 10 Baris per Halaman */}
        {filteredTrips.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] px-5 py-3.5 text-xs text-[#708078] bg-[#fbfdfb]">
            <div>
              Menampilkan{' '}
              <strong className="text-[#10251c]">
                {(safeCurrentPage - 1) * pageSize + 1}–
                {Math.min(safeCurrentPage * pageSize, filteredTrips.length)}
              </strong>{' '}
              dari <strong className="text-[#10251c]">{filteredTrips.length}</strong> tiket
            </div>

            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#b8cec2] bg-white text-[#075b3d] font-bold shadow-xs hover:bg-[#075b3d] hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true
                  return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1
                })
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1]
                  const showEllipsis = prev && pageNum - prev > 1
                  return (
                    <span key={pageNum} className="inline-flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`size-8 rounded-lg text-xs font-bold transition shadow-xs ${
                          pageNum === safeCurrentPage
                            ? 'bg-[#075b3d] text-white ring-2 ring-[#075b3d]/30 font-extrabold'
                            : 'border border-[#b8cec2] bg-white text-[#1b382c] hover:bg-[#d8e8de]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </span>
                  )
                })}

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#b8cec2] bg-white text-[#075b3d] font-bold shadow-xs hover:bg-[#075b3d] hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
      )}

      {/* Decision Modal (E-Sign Approval / Rejection) */}
      {decisionModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDecisionModal(null)
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-[#081f14] text-white shadow-2xl border border-white/20 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div
              className={`flex items-center justify-between border-b px-5 py-4 shrink-0 ${
                decisionModal.action === 'approve'
                  ? 'border-emerald-500/20 bg-emerald-950/40'
                  : 'border-rose-500/20 bg-rose-950/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-xl text-white shrink-0 ${
                    decisionModal.action === 'approve' ? 'bg-[#15803d]' : 'bg-[#dc2626]'
                  }`}
                >
                  {decisionModal.action === 'approve' ? <UserCheck size={18} /> : <ShieldAlert size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {decisionModal.action === 'approve'
                      ? decisionModal.type === 'dept'
                        ? 'Konfirmasi ACC SPV Departemen (Tahap 1)'
                        : 'Konfirmasi ACC Final SPV Kendaraan (Tahap 2)'
                      : 'Tolak Permohonan Kendaraan'}
                  </h3>
                  <p className="text-[10px] text-[#8fa99b]">
                    Tiket: {decisionModal.trip.id} · {decisionModal.trip.destination}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition shrink-0"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#8fa99b]">Pemohon:</span>
                    <span className="font-semibold text-white">
                      {decisionModal.trip.requesterName} ({decisionModal.trip.dept})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8fa99b]">Tujuan:</span>
                    <span className="font-semibold text-white">{decisionModal.trip.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8fa99b]">Waktu Dinas:</span>
                    <span className="font-semibold text-[#bef264]">
                      {fmtDate(decisionModal.trip.date)} ({decisionModal.trip.estDeparture} WIB)
                    </span>
                  </div>
                  {decisionModal.type === 'pool' && decisionModal.trip.plate && (
                    <div className="flex justify-between border-t border-white/10 pt-1.5 text-[#bef264]">
                      <span className="text-[#8fa99b]">Alokasi Armada & Driver:</span>
                      <span className="font-bold">
                        {decisionModal.trip.plate} (
                        {db.drivers.find((d) => d.id === decisionModal.trip.driverId)?.name || 'Driver'})
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#d1fae5] block">
                    {decisionModal.action === 'approve' ? 'Catatan Approver (Opsional)' : 'Alasan Penolakan (Wajib)'}
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        decisionModal.action === 'approve'
                          ? 'Contoh: Disetujui, harap berkendara dengan tertib...'
                          : 'Contoh: Keperluan dinas tidak mendesak / armada tidak mencukupi...'
                      }
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 p-3 text-xs text-white placeholder-white/30 outline-none focus:border-[#a3e635]"
                      required={decisionModal.action === 'reject'}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-white/10 shrink-0 bg-black/20">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={
                    decisionModal.action === 'approve'
                      ? 'rounded-full bg-[#a3e635] px-6 py-2 text-xs font-bold text-[#052e16] shadow-lg shadow-[#a3e635]/20 hover:bg-[#84cc16] transition'
                      : 'rounded-full bg-[#dc2626] px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-[#b91c1c] transition'
                  }
                >
                  {decisionModal.action === 'approve' ? 'Tanda Tangan E-Sign & Terbitkan' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
