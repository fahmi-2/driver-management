'use client'

import { useState } from 'react'
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
  AlertCircle
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useStore, type Trip, fmtDate, fmtTime, STATUS_LABEL } from '@/lib/store'
import { Card, PageHeader, Pill, btnPrimary, btnGhost, tripTone, useToast } from '../ui-bits'

export function ApproverInbox({ user }: { user: Account }) {
  const { db, spvDecision, poolSpvDecision } = useStore()
  const notify = useToast()

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [search, setSearch] = useState('')
  const [decisionModal, setDecisionModal] = useState<{
    trip: Trip
    type: 'dept' | 'pool'
    action: 'approve' | 'reject'
  } | null>(null)
  const [note, setNote] = useState('')

  // Cek apakah user adalah SPV Kendaraan (Pool GA / HR & GA)
  const isPoolSpv = user.username === 'spv_pool' || user.dept === 'HR & GA'

  // Filter trips sesuai hak akses Approver:
  // 1. SPV Departemen: meninjau trip milik departemennya yang berstatus WAITING_SPV (Tahap 1)
  // 2. SPV Kendaraan: meninjau trip yang sudah dijadwalkan oleh admin dan berstatus WAITING_POOL_SPV (Tahap 2)
  const allTrips = db.trips.slice().reverse()

  const pendingTrips = allTrips.filter((t) => {
    if (isPoolSpv) {
      // SPV Kendaraan / Pool GA bisa review Tahap 2 (WAITING_POOL_SPV)
      // dan juga pengajuan departemennya sendiri di Tahap 1 (WAITING_SPV)
      return t.status === 'WAITING_POOL_SPV' || (t.status === 'WAITING_SPV' && t.dept === user.dept)
    }
    // SPV Departemen biasa: hanya trip departemennya yang butuh Tahap 1
    return t.dept === user.dept && t.status === 'WAITING_SPV'
  })

  const historyTrips = allTrips.filter((t) => {
    if (isPoolSpv) {
      return t.poolSpvAt || (t.dept === user.dept && t.spvAt)
    }
    return t.dept === user.dept && t.spvAt
  })

  const currentList = activeTab === 'pending' ? pendingTrips : historyTrips

  const filteredTrips = currentList.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.destination.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q) ||
      t.requesterName.toLowerCase().includes(q) ||
      t.guest.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    )
  })

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
                {isPoolSpv ? 'Otoritas: SPV Kendaraan (Tahap 2 Final)' : `Otoritas: SPV ${user.dept} (Tahap 1)`}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#93a097]">
              {isPoolSpv
                ? 'Memverifikasi alokasi armada yang telah dipetakan oleh Admin Utama sebelum tugas diterbitkan ke Driver.'
                : `Memvalidasi permohonan dinas karyawan di lingkungan departemen ${user.dept}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-[#bef264]">
          <span className="font-bold">{pendingTrips.length} Pengajuan</span> memerlukan tindakan E-Sign Anda.
        </div>
      </div>

      <Card
        title={activeTab === 'pending' ? 'Daftar Pengajuan Menunggu ACC' : 'Riwayat Keputusan Approver'}
        subtitle={`Total ${filteredTrips.length} data ditemukan`}
        action={
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[#93a097]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tujuan / pemohon / nomor tiket..."
              className="h-8 w-56 sm:w-64 rounded-lg bg-[#f5f7f5] pl-8 pr-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
            />
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
            {filteredTrips.map((trip) => {
              const isStage1 = trip.status === 'WAITING_SPV'
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

                      <h3 className="text-sm font-bold text-[#10251c]">{trip.destination}</h3>
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
      </Card>

      {/* Decision Modal (E-Sign Approval / Rejection) */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden">
            <div
              className={`flex items-center justify-between border-b px-6 py-4 ${
                decisionModal.action === 'approve'
                  ? 'border-[#dcfce7] bg-[#f0fdf4]'
                  : 'border-[#fee2e2] bg-[#fef2f2]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-xl text-white ${
                    decisionModal.action === 'approve' ? 'bg-[#15803d]' : 'bg-[#dc2626]'
                  }`}
                >
                  {decisionModal.action === 'approve' ? <UserCheck size={18} /> : <ShieldAlert size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10251c]">
                    {decisionModal.action === 'approve'
                      ? decisionModal.type === 'dept'
                        ? 'Konfirmasi ACC SPV Departemen (Tahap 1)'
                        : 'Konfirmasi ACC Final SPV Kendaraan (Tahap 2)'
                      : 'Tolak Permohonan Kendaraan'}
                  </h3>
                  <p className="text-[10px] text-[#708078]">
                    Tiket: {decisionModal.trip.id} · {decisionModal.trip.destination}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleDecisionSubmit} className="p-6 space-y-4">
              <div className="rounded-xl border border-white/5 bg-[#f7faf8] p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#708078]">Pemohon:</span>
                  <span className="font-semibold text-[#10251c]">
                    {decisionModal.trip.requesterName} ({decisionModal.trip.dept})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#708078]">Tujuan:</span>
                  <span className="font-semibold text-[#10251c]">{decisionModal.trip.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#708078]">Waktu Dinas:</span>
                  <span className="font-semibold text-[#10251c]">
                    {fmtDate(decisionModal.trip.date)} ({decisionModal.trip.estDeparture} WIB)
                  </span>
                </div>
                {decisionModal.type === 'pool' && decisionModal.trip.plate && (
                  <div className="flex justify-between border-t border-[#edf1ee] pt-1.5 text-[#075b3d]">
                    <span>Alokasi Armada & Driver:</span>
                    <span className="font-bold">
                      {decisionModal.trip.plate} (
                      {db.drivers.find((d) => d.id === decisionModal.trip.driverId)?.name || 'Driver'})
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#66766d]">
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
                    className="mt-1.5 w-full rounded-xl border border-[#dce7df] p-3 text-xs outline-none focus:border-[#075b3d]"
                    required={decisionModal.action === 'reject'}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className={`${btnGhost} !px-4 !py-2`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={
                    decisionModal.action === 'approve'
                      ? `${btnPrimary} !px-6 !py-2`
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
