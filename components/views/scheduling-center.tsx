'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock,
  Filter,
  Info,
  MapPin,
  ShieldAlert,
  Sparkles,
  Truck,
  User,
  UserCheck,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useStore, type Trip, type Driver, type Vehicle, fmtDate, fmtTime, driverState, vehicleState, ymd } from '@/lib/store'
import { Card, PageHeader, Pill, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'
import { VehicleTimelineScheduler, type TimelineSelection } from '../vehicle-timeline-scheduler'

export function AdminSchedulingCenter({ user }: { user: Account }) {
  const { db, scheduleTrip, rejectTrip } = useStore()
  const notify = useToast()

  // Selected pending trip from the left sidebar waiting list
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  // Modals
  const [rejectingTrip, setRejectingTrip] = useState<Trip | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [confirmModalData, setConfirmModalData] = useState<{
    trip: Trip
    selection: TimelineSelection
    driverId: string
    adminNote: string
  } | null>(null)

  // Pending requests: trips needing assignment (either WAITING_ASSIGN or pending SPV for preview)
  const pendingRequests = db.trips.filter(
    (t) => t.status === 'WAITING_ASSIGN' || t.status === 'WAITING_SPV'
  )

  const activeVehicles = db.vehicles.filter((v) => (v.status || 'Active') === 'Active')

  // Handle Drag Selection on the Interactive Calendar
  const handleCalendarTimeSelect = (selection: TimelineSelection) => {
    if (!selectedTrip) {
      notify('Silakan pilih salah satu Pengajuan Tertunda (Pending Request) di sebelah kiri terlebih dahulu!')
      return
    }

    // Default to first available driver
    const availableDrivers = db.drivers.filter((d) => driverState(db, d.id) === 'Tersedia')
    const defaultDriverId = availableDrivers[0]?.id || ''

    setConfirmModalData({
      trip: selectedTrip,
      selection,
      driverId: defaultDriverId,
      adminNote: '',
    })
  }

  // Handle Confirm Assignment
  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmModalData) return

    const { trip, selection, driverId, adminNote } = confirmModalData

    scheduleTrip(trip.id, {
      plate: selection.selectedVehiclePlate,
      driverId: driverId || undefined,
      date: selection.date,
      estDeparture: selection.startTime,
      estReturn: selection.endTime,
      adminNote: adminNote.trim() || undefined,
    })

    notify(
      `Pengajuan ${trip.id} berhasil dijadwalkan ke armada ${selection.selectedVehiclePlate} (${selection.startTime} - ${selection.endTime})!`
    )
    setConfirmModalData(null)
    setSelectedTrip(null)
  }

  // Handle Reject Request
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingTrip) return
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi!')
      return
    }

    rejectTrip(rejectingTrip.id, rejectReason.trim())
    notify(`Pengajuan ${rejectingTrip.id} berhasil ditolak. Notifikasi dikirim ke pemohon.`)
    setRejectingTrip(null)
    setRejectReason('')
    if (selectedTrip?.id === rejectingTrip.id) setSelectedTrip(null)
  }

  return (
    <>
      <PageHeader
        title="Waiting List & Scheduling Center"
        desc="Pusat penjadwalan & dispatching armada. Review pengajuan divisi dan petakan langsung ke kalender armada."
      />

      {/* Split-Screen Integrated Layout */}
      <div className="grid gap-5 xl:grid-cols-[380px_1fr] items-start">
        {/* Left Side: Pending Requests List */}
        <div className="space-y-4">
          <Card
            title="Antrean Pengajuan (Pending Requests)"
            subtitle={`${pendingRequests.length} pengajuan menunggu alokasi armada`}
          >
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9aa7a0]">
                Tidak ada pengajuan kendaraan yang menunggu penjadwalan saat ini.
              </div>
            ) : (
              <div className="divide-y divide-[#edf1ee] max-h-[720px] overflow-y-auto">
                {pendingRequests.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id
                  const isSpvPending = trip.status === 'WAITING_SPV'

                  return (
                    <div
                      key={trip.id}
                      className={`p-4 transition cursor-pointer rounded-xl m-1 ${
                        isSelected
                          ? 'bg-lime-400/20 border-l-4 border-[#a3e635]'
                          : 'hover:bg-lime-400/10'
                      }`}
                      onClick={() => setSelectedTrip(trip)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold font-mono text-[#075b3d] bg-white px-2 py-0.5 rounded border border-[#dce7df]">
                          {trip.id} · {trip.dept}
                        </span>
                        <Pill
                          label={isSpvPending ? 'Menunggu SPV' : 'Siap Jadwal'}
                          tone={isSpvPending ? 'amber' : 'purple'}
                        />
                      </div>

                      <h4 className="mt-2 text-xs font-bold text-[#10251c]">
                        {trip.destination}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[#708078] line-clamp-1">
                        {trip.purpose}
                      </p>

                      <div className="mt-2.5 space-y-1 text-[10px] text-[#63726a]">
                        <p className="flex items-center gap-1.5">
                          <User size={12} className="text-[#93a097]" />
                          <span>Tamu: <strong>{trip.guest}</strong></span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#93a097]" />
                          <span>
                            {fmtDate(trip.date)} · Est. Keberangkatan {trip.estDeparture} WIB
                          </span>
                        </p>
                      </div>

                      {/* Action buttons inside card */}
                      <div className="mt-3 flex items-center justify-between border-t border-[#e2ece5] pt-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRejectingTrip(trip)
                            setRejectReason('')
                          }}
                          className="text-[11px] font-bold text-[#b91c1c] hover:underline"
                        >
                          Tolak (Reject)
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTrip(trip)
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#075b3d] text-white shadow-xs'
                              : 'bg-white border border-[#b8cfc2] text-[#075b3d] hover:bg-[#eef5f0]'
                          }`}
                        >
                          <Sparkles size={12} />
                          {isSelected ? 'Terpilih (Drag Grid)' : 'Pilih untuk Jadwal'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Quick Guidance Box */}
          <div className="rounded-2xl border border-[#d8e8de] bg-[#f4f9f6] p-4 text-xs text-[#264b38]">
            <h5 className="font-bold flex items-center gap-1.5 text-[#075b3d]">
              <Info size={15} />
              Cara Menjadwalkan Pengajuan:
            </h5>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-[11px] text-[#55695e]">
              <li>Klik salah satu pengajuan di antrean sebelah kiri.</li>
              <li>Arahkan kursor ke baris kendaraan tujuan pada kalender timeline di sebelah kanan.</li>
              <li><strong>Klik & drag</strong> pada rentang jam kosong untuk memilih durasi waktu.</li>
              <li>Isi catatan opsional & pilih supir pada jendela konfirmasi.</li>
            </ol>
          </div>
        </div>

        {/* Right Side: Interactive Calendar Scheduler */}
        <div className="space-y-4 min-w-0 overflow-hidden">
          {/* Active selection banner */}
          {selectedTrip && (
            <div className="flex items-center justify-between rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#075b3d] text-white shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#166534]">
                      Sedang Menjadwalkan: {selectedTrip.id} · {selectedTrip.guest}
                    </span>
                    <span className="rounded bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                      {selectedTrip.dept}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#15803d]/90">
                    Tujuan: <strong>{selectedTrip.destination}</strong> · Silakan drag pada baris kendaraan di bawah ini!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="flex items-center gap-1 rounded-lg border border-[#bbf7d0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#166534] hover:bg-[#dcfce7]"
              >
                <X size={13} />
                Batalkan Pilihan
              </button>
            </div>
          )}

          {/* Interactive Timeline Calendar */}
          <VehicleTimelineScheduler
            vehicles={db.vehicles}
            bookings={db.trips}
            user={user}
            interactive={true}
            selectedPendingTrip={selectedTrip}
            onTimeSelect={handleCalendarTimeSelect}
          />
        </div>
      </div>

      {/* MODAL 1: Mandatory Reason Reject Modal */}
      {rejectingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#fff5f5] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#dc2626] text-white">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#991b1b]">Tolak Pengajuan Kendaraan</h3>
                  <p className="text-[10px] text-[#b91c1c]">{rejectingTrip.id} · {rejectingTrip.destination}</p>
                </div>
              </div>
              <button onClick={() => setRejectingTrip(null)} className="p-1 rounded-lg hover:bg-[#fee2e2]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[#708078]">
                Alasan penolakan ini bersifat <strong>wajib</strong> dan akan dikirimkan langsung ke inbox notifikasi pemohon ({rejectingTrip.requesterName}).
              </p>

              <div>
                <label className="text-xs font-semibold text-[#66766d]">
                  Alasan / Keterangan Penolakan (Wajib)
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Seluruh armada sedang bertugas penuh / Silakan sesuaikan jam dinas..."
                    className="mt-1.5 w-full rounded-xl border border-[#dce7df] p-3 text-xs outline-none focus:border-[#dc2626]"
                    required
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setRejectingTrip(null)}
                  className={`${btnGhost} !px-4 !py-2`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#dc2626] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#b91c1c] transition"
                >
                  Konfirmasi Tolak Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve & Assign Confirmation Modal (with Optional Note) */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#dce7df] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#edf1ee] bg-[#f7faf8] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#075b3d] text-white">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10251c]">Konfirmasi Penjadwalan Armada</h3>
                  <p className="text-[10px] text-[#708078]">
                    Alokasi kendaraan & driver untuk pengajuan {confirmModalData.trip.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalData(null)}
                className="p-1 rounded-lg text-[#708078] hover:bg-[#edf2ef]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4">
              {/* Scheduled Summary Box */}
              <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs space-y-2">
                <div className="flex justify-between items-center text-[#166534] font-semibold border-b border-[#dcfce7] pb-1.5">
                  <span>Hasil Seleksi Timeline:</span>
                  <span className="font-mono font-bold">{confirmModalData.selection.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#15803d]">
                  <div>
                    <span className="text-[#86efac]">Armada:</span>
                    <p className="font-bold text-[#14532d] text-sm">
                      {confirmModalData.selection.selectedVehiclePlate}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#86efac]">Jam Operasional:</span>
                    <p className="font-bold text-[#14532d] text-sm">
                      {confirmModalData.selection.startTime} – {confirmModalData.selection.endTime} WIB
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#86efac]">Tujuan & Tamu:</span>
                    <p className="font-semibold text-[#14532d]">
                      {confirmModalData.trip.destination} ({confirmModalData.trip.guest})
                    </p>
                  </div>
                </div>
              </div>

              {/* Driver Selection */}
              <div>
                <label className="text-xs font-semibold text-[#66766d]">
                  Pilih Driver (Sopir)
                  <select
                    value={confirmModalData.driverId}
                    onChange={(e) =>
                      setConfirmModalData({ ...confirmModalData, driverId: e.target.value })
                    }
                    className={inputCls}
                  >
                    <option value="">Pilih Driver (Opsional/Nanti)...</option>
                    {db.drivers.map((d) => {
                      const s = driverState(db, d.id)
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} ({s})
                        </option>
                      )
                    })}
                  </select>
                </label>
              </div>

              {/* Optional Admin Note */}
              <div>
                <label className="text-xs font-semibold text-[#66766d]">
                  Catatan Tambahan Admin (Opsional)
                  <textarea
                    rows={2}
                    value={confirmModalData.adminNote}
                    onChange={(e) =>
                      setConfirmModalData({ ...confirmModalData, adminNote: e.target.value })
                    }
                    placeholder="Contoh: Harap kumpul 15 menit sebelum berangkat di lobi utama..."
                    className="mt-1.5 w-full rounded-xl border border-[#dce7df] p-3 text-xs outline-none focus:border-[#075b3d]"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf1ee]">
                <button
                  type="button"
                  onClick={() => setConfirmModalData(null)}
                  className={`${btnGhost} !px-4 !py-2`}
                >
                  Batal
                </button>
                <button type="submit" className={`${btnPrimary} !px-6 !py-2`}>
                  <Check size={14} />
                  Jadwalkan & Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
