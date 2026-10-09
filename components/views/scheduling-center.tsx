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
  RotateCcw,
  Plus,
  Trash2,
  Users,
  AlertCircle
} from 'lucide-react'
import { DEPARTMENTS, DEPARTMENT_APPROVERS, type Account } from '@/lib/accounts'
import { useStore, type Trip, type Driver, type Vehicle, type Passenger, type Category, fmtDate, fmtTime, driverState, vehicleState, ymd } from '@/lib/store'
import { Card, PageHeader, Pill, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'
import { VehicleTimelineScheduler, type TimelineSelection } from '../vehicle-timeline-scheduler'
import { DestinationAutocomplete } from '../destination-autocomplete'

export function AdminSchedulingCenter({ user }: { user: Account }) {
  const { db, scheduleTrip, rejectTrip, directBooking } = useStore()
  const notify = useToast()

  // Kapasitas maksimum kendaraan dari master fleet
  const maxVehicleCapacity = Math.max(7, ...db.vehicles.map((v) => v.capacity || 7))

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

  // Direct Booking state ketika drag pada grid kosong atau tombol "Ajukan Permohonan Perjalanan"
  const [directBookingData, setDirectBookingData] = useState<{
    selection: TimelineSelection
    category: Category
    requesterName: string
    requesterNik: string
    dept: string
    approvedBy: string
    destination: string
    destinations: string[]
    purpose: string
    distance_km?: number
    estimated_duration_minutes?: number
    driverId: string
    adminNote: string
    driverOnly: boolean
    additionalUsers: Passenger[]
    isOtherVehicle: boolean
    otherVehicleName: string
  } | null>(null)

  // Handle Drag Selection on the Interactive Calendar
  const handleCalendarTimeSelect = (selection: TimelineSelection) => {
    // Cari supir default dari kendaraan yang di-drag
    const defaultDriverForCar = db.drivers.find((d) => d.defaultPlate === selection.selectedVehiclePlate)
    const availableDrivers = db.drivers.filter((d) => driverState(db, d.id) === 'Tersedia')
    const fallbackDriverId = defaultDriverForCar?.id || availableDrivers[0]?.id || ''

    if (!selectedTrip) {
      // FITUR DIRECT BOOKING VIA KALENDER (DRAG-TO-BOOK)
      // Menampilkan popup pengajuan lengkap seperti form requester
      const defaultDept = user.dept && DEPARTMENTS.includes(user.dept) ? user.dept : 'HR & GA'
      const approvers = DEPARTMENT_APPROVERS[defaultDept] || []

      setDirectBookingData({
        selection,
        category: 'Dinas',
        requesterName: user.name || 'Admin Utama',
        requesterNik: user.nik || 'JAI-2015003',
        dept: defaultDept,
        approvedBy: approvers[0] || '',
        destination: '',
        destinations: [''],
        purpose: '',
        distance_km: undefined,
        estimated_duration_minutes: undefined,
        driverId: fallbackDriverId,
        adminNote: '',
        driverOnly: false,
        additionalUsers: [],
        isOtherVehicle: false,
        otherVehicleName: '',
      })
      return
    }

    if (selectedTrip.status === 'WAITING_SPV') {
      notify('Terkunci! Pengajuan ini belum di-ACC oleh SPV Departemen (Tahap 1), tidak bisa dijadwalkan.')
      return
    }

    // Default driver untuk pengajuan tertunda
    setConfirmModalData({
      trip: selectedTrip,
      selection,
      driverId: fallbackDriverId,
      adminNote: '',
    })
  }

  // Handle Confirm Assignment untuk Pengajuan Tertunda
  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmModalData) return

    const { trip, selection, driverId, adminNote } = confirmModalData

    if (!adminNote.trim()) {
      alert('Catatan Admin wajib diisi!')
      return
    }

    scheduleTrip(trip.id, {
      plate: selection.selectedVehiclePlate,
      driverId: driverId || undefined,
      date: selection.date,
      estDeparture: selection.startTime,
      estReturn: selection.endTime,
      adminNote: adminNote.trim(),
    })

    notify(
      `Pengajuan ${trip.id} berhasil dipetakan ke armada ${selection.selectedVehiclePlate}. Status berubah menjadi Pending Approval SPV Kendaraan (Tahap 2).`
    )
    setConfirmModalData(null)
    setSelectedTrip(null)
  }

  // Handle Submit Direct Booking
  const handleDirectBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!directBookingData) return

    if (!directBookingData.destination.trim()) {
      notify('Tujuan perjalanan wajib diisi!')
      return
    }
    if (!directBookingData.adminNote.trim()) {
      notify('Catatan Admin wajib diisi!')
      return
    }

    const {
      selection,
      category,
      requesterName,
      requesterNik,
      dept,
      approvedBy,
      destination,
      destinations,
      purpose,
      distance_km,
      estimated_duration_minutes,
      driverId,
      adminNote,
      driverOnly,
      additionalUsers,
      isOtherVehicle,
      otherVehicleName,
    } = directBookingData

    // Gabungkan pemohon utama dengan user tambahan jika bukan driverOnly
    const allPassengers: Passenger[] = driverOnly
      ? []
      : [
          { name: requesterName.trim(), nik: requesterNik.trim(), dept },
          ...additionalUsers.filter((u) => u.name.trim()),
        ]

    const guestLabel = driverOnly
      ? `Hanya Driver (Operasional Logistik)`
      : requesterName.trim()

    // Tentukan plat: jika Mobil Lain, gunakan nama mobil lain
    const targetPlate = isOtherVehicle && otherVehicleName.trim() ? otherVehicleName.trim() : selection.selectedVehiclePlate

    directBooking({
      plate: targetPlate,
      driverId: driverId || undefined,
      date: selection.date,
      estDeparture: selection.startTime,
      estReturn: selection.endTime,
      destination: destination.trim(),
      destinations: destinations.filter(Boolean),
      purpose: purpose.trim() || 'Operasional Pabrik / Direct Booking',
      guest: guestLabel,
      category,
      dept,
      requesterName: requesterName.trim(),
      requesterNik: requesterNik.trim(),
      approvedBy,
      passengers: allPassengers,
      adminNote: adminNote.trim(),
      driverOnly,
      isOtherVehicle,
      otherVehicleName: isOtherVehicle ? otherVehicleName.trim() : undefined,
      distance_km,
      estimated_duration_minutes,
    })

    notify(
      `Permohonan Direct Booking armada ${targetPlate} (${selection.startTime} - ${selection.endTime}) berhasil diajukan! Menunggu ACC SPV Kendaraan (Tahap 2).`
    )
    setDirectBookingData(null)
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
            action={
              <button
                type="button"
                onClick={() => {
                  const defaultVehicle = activeVehicles[0]?.plate || 'B 1824 KQA'
                  const defaultDriver = db.drivers.find((d) => d.defaultPlate === defaultVehicle)
                  const fallbackDriver = defaultDriver?.id || db.drivers[0]?.id || ''
                  const defaultDept = user.dept && DEPARTMENTS.includes(user.dept) ? user.dept : 'HR & GA'
                  const approvers = DEPARTMENT_APPROVERS[defaultDept] || []

                  setDirectBookingData({
                    selection: {
                      selectedVehiclePlate: defaultVehicle,
                      date: ymd(),
                      startTime: '08:00',
                      endTime: '12:00',
                    },
                    category: 'Dinas',
                    requesterName: user.name || 'Admin Utama',
                    requesterNik: user.nik || 'JAI-2015003',
                    dept: defaultDept,
                    approvedBy: approvers[0] || '',
                    destination: '',
                    destinations: [''],
                    purpose: '',
                    distance_km: undefined,
                    estimated_duration_minutes: undefined,
                    driverId: fallbackDriver,
                    adminNote: '',
                    driverOnly: false,
                    additionalUsers: [],
                    isOtherVehicle: false,
                    otherVehicleName: '',
                  })
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#075b3d] hover:bg-[#064e34] text-white px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Plus size={14} />
                Ajukan Perjalanan
              </button>
            }
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
                      className={`p-4 transition rounded-xl m-1 ${
                        isSpvPending
                          ? 'bg-amber-500/5 border border-amber-300/40 opacity-80 cursor-not-allowed'
                          : isSelected
                          ? 'bg-lime-400/20 border-l-4 border-[#a3e635] cursor-pointer'
                          : 'hover:bg-lime-400/10 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (isSpvPending) {
                          notify('Pengajuan terkunci! Menunggu E-Sign SPV Departemen (Tahap 1).')
                          return
                        }
                        setSelectedTrip(trip)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold font-mono text-[#075b3d] bg-white px-2 py-0.5 rounded border border-[#dce7df]">
                          {trip.id} · {trip.dept}
                        </span>
                        <Pill
                          label={isSpvPending ? '🔒 Terkunci (SPV Dept)' : '✓ Siap Di-drag'}
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

                        {isSpvPending ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert size={11} /> Belum di-ACC SPV
                          </span>
                        ) : (
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
                        )}
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

              {/* Mandatory Admin Note */}
              <div>
                <label className="text-xs font-semibold text-[#66766d]">
                  Catatan Tambahan Admin <span className="text-[#dc2626]">*Wajib Diisi</span>
                  <textarea
                    rows={2}
                    value={confirmModalData.adminNote}
                    onChange={(e) =>
                      setConfirmModalData({ ...confirmModalData, adminNote: e.target.value })
                    }
                    placeholder="Contoh: Harap kumpul 15 menit sebelum berangkat di lobi utama..."
                    className="mt-1.5 w-full rounded-xl border border-[#dce7df] p-3 text-xs outline-none focus:border-[#075b3d]"
                    required
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
                  Jadwalkan & Kirim ke SPV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct Booking via Kalender (Drag-to-Book / Ajukan Perjalanan) */}
      {directBookingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-[#081f14] text-white shadow-2xl border border-white/15 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#075b3d] px-6 py-4 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Formulir Pengajuan Perjalanan Armada (Admin Pool)</h3>
                  <p className="text-[11px] text-[#bef264]">
                    Alokasi langsung kalender untuk armada <span className="font-bold underline">{directBookingData.selection.selectedVehiclePlate}</span> ({directBookingData.selection.date})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDirectBookingData(null)}
                className="p-1 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleDirectBookingSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
              {/* Slot Terpilih Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between items-center font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Tanggal & Jam Kalender:</span>
                  <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                    {directBookingData.selection.date} • {directBookingData.selection.startTime} – {directBookingData.selection.endTime} WIB
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#8fa99b]">
                  <span>Armada Baris: <strong className="text-emerald-400 font-mono">{directBookingData.selection.selectedVehiclePlate}</strong></span>
                  <span>Kapasitas Kursi: <strong>{maxVehicleCapacity} Orang</strong></span>
                </div>
              </div>

              {/* 1. Kategori Perjalanan (Dinas / Non-Dinas) */}
              <div>
                <label className="text-xs font-semibold text-[#8fa99b] block mb-1.5">
                  Kategori Keperluan Perjalanan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Dinas', 'Non-Dinas'] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDirectBookingData({ ...directBookingData, category: cat })}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                        directBookingData.category === cat
                          ? 'border-[#a3e635] bg-[#a3e635]/15 text-[#bef264] shadow-xs'
                          : 'border-white/10 bg-white/[0.02] text-[#8fa99b] hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className={`size-2 rounded-full ${directBookingData.category === cat ? 'bg-[#a3e635]' : 'bg-transparent border border-white/30'}`} />
                      {cat === 'Dinas' ? 'Perjalanan Dinas (Operasional)' : 'Non-Dinas (Keperluan Khusus)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Rincian Pemohon Utama & Approval Bertingkat */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <User size={13} className="text-[#a3e635]" /> Data Pemohon Utama
                  </span>
                  <span className="text-[10px] text-[#8fa99b]">Wajib Dilengkapi</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                      Nama Pemohon <span className="text-[#a3e635]">*</span>
                    </label>
                    <input
                      type="text"
                      value={directBookingData.requesterName}
                      onChange={(e) => setDirectBookingData({ ...directBookingData, requesterName: e.target.value })}
                      placeholder="Nama lengkap pemohon"
                      className={inputCls}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                      NIK Pemohon <span className="text-[#a3e635]">*</span>
                    </label>
                    <input
                      type="text"
                      value={directBookingData.requesterNik}
                      onChange={(e) => setDirectBookingData({ ...directBookingData, requesterNik: e.target.value })}
                      placeholder="Contoh: JAI-2015003"
                      className={`${inputCls} font-mono`}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                      Departemen Pemohon <span className="text-[#a3e635]">*</span>
                    </label>
                    <select
                      value={directBookingData.dept}
                      onChange={(e) => {
                        const newDept = e.target.value
                        const approvers = DEPARTMENT_APPROVERS[newDept] || []
                        setDirectBookingData({
                          ...directBookingData,
                          dept: newDept,
                          approvedBy: approvers[0] || '',
                        })
                      }}
                      className={`${inputCls} bg-black/40`}
                      required
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d} className="bg-[#081f14] text-white">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                      Approved By (Manajer/SSPV Dept) <span className="text-[#a3e635]">*</span>
                    </label>
                    <select
                      value={directBookingData.approvedBy}
                      onChange={(e) => setDirectBookingData({ ...directBookingData, approvedBy: e.target.value })}
                      className={`${inputCls} bg-black/40 font-semibold text-[#bef264]`}
                      required
                    >
                      {(DEPARTMENT_APPROVERS[directBookingData.dept] || []).map((appr) => (
                        <option key={appr} value={appr} className="bg-[#081f14] text-white">
                          {appr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Opsi "Hanya Driver" & Penumpang Tambahan */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div
                  className={`rounded-xl border p-3 transition ${
                    directBookingData.driverOnly
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/30'
                      : 'border-white/10 bg-white/[0.02] text-[#8fa99b]'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={directBookingData.driverOnly}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setDirectBookingData({
                          ...directBookingData,
                          driverOnly: checked,
                          additionalUsers: checked ? [] : directBookingData.additionalUsers,
                        })
                      }}
                      className="mt-0.5 size-4 rounded text-[#075b3d] accent-[#075b3d]"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Opsi "Hanya Driver" (Kirim Barang / Dokumen tanpa penumpang)
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                            directBookingData.driverOnly
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : 'bg-white/10 text-[#8fa99b]'
                          }`}
                        >
                          {directBookingData.driverOnly ? 'Kupon Makan VOID' : 'Kupon Normal'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#93a097]">
                        Ditujukan kepada driver baris kendaraan terpilih. Hak klaim kupon makan siang driver otomatis hangus (VOID).
                      </p>
                    </div>
                  </label>
                </div>

                {/* User Tambahan Multi-Penumpang */}
                {!directBookingData.driverOnly && directBookingData.additionalUsers.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[11px] font-bold text-[#bef264] flex items-center gap-1.5">
                      <Users size={13} className="text-[#a3e635]" /> Rekan / Penumpang Tambahan ({directBookingData.additionalUsers.length})
                    </p>

                    {directBookingData.additionalUsers.map((u, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2 transition hover:border-white/15"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#bef264]">
                            Penumpang Tambahan #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDirectBookingData({
                                ...directBookingData,
                                additionalUsers: directBookingData.additionalUsers.filter((_, i) => i !== idx),
                              })
                            }}
                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              Nama Lengkap <span className="text-[#a3e635]">*</span>
                            </label>
                            <input
                              type="text"
                              value={u.name}
                              onChange={(e) => {
                                const val = e.target.value
                                setDirectBookingData({
                                  ...directBookingData,
                                  additionalUsers: directBookingData.additionalUsers.map((item, i) =>
                                    i === idx ? { ...item, name: val } : item
                                  ),
                                })
                              }}
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
                              onChange={(e) => {
                                const val = e.target.value
                                setDirectBookingData({
                                  ...directBookingData,
                                  additionalUsers: directBookingData.additionalUsers.map((item, i) =>
                                    i === idx ? { ...item, nik: val } : item
                                  ),
                                })
                              }}
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
                              onChange={(e) => {
                                const val = e.target.value
                                setDirectBookingData({
                                  ...directBookingData,
                                  additionalUsers: directBookingData.additionalUsers.map((item, i) =>
                                    i === idx ? { ...item, dept: val } : item
                                  ),
                                })
                              }}
                              className={`${inputCls} bg-black/40`}
                              required
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d} className="bg-[#081f14] text-white">
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tombol Tambah User */}
                {!directBookingData.driverOnly && (1 + directBookingData.additionalUsers.length) < maxVehicleCapacity && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirectBookingData({
                        ...directBookingData,
                        additionalUsers: [
                          ...directBookingData.additionalUsers,
                          { name: '', nik: '', dept: directBookingData.dept },
                        ],
                      })
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#a3e635]/40 bg-[#a3e635]/5 px-3 py-1.5 text-xs font-bold text-[#bef264] hover:bg-[#a3e635]/15 transition"
                  >
                    <Plus size={13} /> Tambah Rekan / Penumpang ({1 + directBookingData.additionalUsers.length}/{maxVehicleCapacity})
                  </button>
                )}
              </div>

              {/* 4. Fitur Rute Multi-Drop & Integrasi Peta PT. JAI */}
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label className="text-xs font-semibold text-[#8fa99b] block mb-1">
                  Rute Perjalanan (Multi-Drop) & Peta PT. JAI
                </label>
                <DestinationAutocomplete
                  value={directBookingData.destination}
                  destinations={directBookingData.destinations}
                  distanceKm={directBookingData.distance_km}
                  durationMins={directBookingData.estimated_duration_minutes}
                  onChange={(data) => {
                    setDirectBookingData({
                      ...directBookingData,
                      destination: data.destination,
                      destinations: data.destinations,
                      distance_km: data.distance_km,
                      estimated_duration_minutes: data.estimated_duration_minutes,
                    })
                  }}
                />
              </div>

              {/* 5. Keperluan Perjalanan */}
              <div>
                <label className="text-xs font-semibold text-[#8fa99b]">
                  Keperluan / Alasan Kunjungan <span className="text-[#a3e635]">*</span>
                  <input
                    value={directBookingData.purpose}
                    onChange={(e) => setDirectBookingData({ ...directBookingData, purpose: e.target.value })}
                    placeholder="Contoh: Survey lokasi vendor / Pengiriman part urgent"
                    className={inputCls}
                    required
                  />
                </label>
              </div>

              {/* 6. Edge Case Opsi Mobil Lain */}
              <div className="rounded-xl border border-purple-400/30 bg-purple-950/20 p-3.5 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={directBookingData.isOtherVehicle}
                    onChange={(e) => setDirectBookingData({ ...directBookingData, isOtherVehicle: e.target.checked })}
                    className="size-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-purple-300">
                    Opsi "Mobil Lain" (Driver ditugaskan membawa mobil master lain / mobil manajer di luar sistem)
                  </span>
                </label>
                {directBookingData.isOtherVehicle && (
                  <div className="ml-6 space-y-1.5 animate-in fade-in duration-100">
                    <p className="text-[11px] text-purple-300/80">
                      <strong>Logika Pemblokiran Default:</strong> Baris kalender untuk mobil default driver ini akan otomatis diblokir dengan keterangan Catatan Admin.
                    </p>
                    <input
                      value={directBookingData.otherVehicleName}
                      onChange={(e) => setDirectBookingData({ ...directBookingData, otherVehicleName: e.target.value })}
                      placeholder="Masukkan nama / plat mobil luar (misal: Camry Direksi B 9999 JAI)"
                      className={`${inputCls} border-purple-500/40 bg-black/60`}
                      required
                    />
                  </div>
                )}
              </div>

              {/* 7. Penugasan Driver */}
              <div>
                <label className="text-xs font-semibold text-[#8fa99b]">
                  Pilih Driver (Sopir)
                  <select
                    value={directBookingData.driverId}
                    onChange={(e) => setDirectBookingData({ ...directBookingData, driverId: e.target.value })}
                    className={`${inputCls} bg-black/40`}
                  >
                    <option value="">Pilih Driver...</option>
                    {db.drivers.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#081f14] text-white">
                        {d.name} ({driverState(db, d.id)}) {d.defaultPlate ? `· Default: ${d.defaultPlate}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 8. Catatan Admin Wajib */}
              <div>
                <label className="text-xs font-semibold text-[#8fa99b]">
                  Catatan Admin <span className="text-[#dc2626]">*Wajib Diisi</span>
                  <textarea
                    rows={2}
                    value={directBookingData.adminNote}
                    onChange={(e) => setDirectBookingData({ ...directBookingData, adminNote: e.target.value })}
                    placeholder="Contoh: Pengajuan langsung oleh Pool GA untuk penjemputan tamu audit..."
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs text-white outline-none focus:border-[#a3e635]"
                    required
                  />
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setDirectBookingData(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#075b3d] hover:bg-[#064e34] px-5 py-2 text-xs font-bold text-white shadow-lg transition active:scale-95"
                >
                  <Check size={14} />
                  Simpan & Terbitkan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
