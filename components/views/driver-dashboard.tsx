'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { 
  useStore, 
  ymd, 
  getWibNow, 
  calculateDriverLiveAttendance, 
  fmtTime, 
  fmtDate,
  fmtDur,
  calculateEstimatedFuel
} from '@/lib/store'
import { Account } from '@/lib/accounts'
import { Card, PageHeader, Pill, useToast } from '../ui-bits'
import { ModalPortal } from '../modal-portal'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Navigation, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  Timer,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Fuel,
  Info
} from 'lucide-react'

const DELAY_REASONS = [
  'Kemacetan Lalu Lintas (Traffic Jam / Macet Parah)',
  'Kondisi Cuaca Ekstrem / Hujan Deras / Banjir',
  'Antrean Panjang / Urusan Tambahan di Lokasi Tujuan',
  'Kendala Teknis / Masalah Mesin atau Ban Kendaraan',
  'Perubahan Rute / Permintaan Tambahan Penumpang',
  'Lainnya',
]

interface DriverDashboardProps {
  user: Account
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const { 
    db, 
    clockInDriver, 
    clockOutDriver, 
    startDriverTrip, 
    endDriverTrip, 
    submitDelayReason,
    endOvertime,
    submitOvertimeReport
  } = useStore()
  const notify = useToast()

  // Live WIB Clock state that ticks every second
  const [wibTimeStr, setWibTimeStr] = useState<string>('')
  const [wibNow, setWibNow] = useState(() => getWibNow())

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const wib = getWibNow(now)
      setWibNow(wib)
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      setWibTimeStr(formatter.format(now).replace(/\./g, ':'))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Match driver by driverId, username, or name
  const matchedDriver = useMemo(() => {
    if (user.driverId) {
      const byId = db.drivers.find((d) => d.id === user.driverId)
      if (byId) return byId
    }
    const cleanUser = user.username.toLowerCase()
    const cleanName = user.name.toLowerCase()

    return (
      db.drivers.find(
        (d) =>
          d.id.toLowerCase() === cleanUser ||
          d.name.toLowerCase() === cleanName ||
          d.name.toLowerCase() === cleanUser ||
          cleanName.includes(d.name.toLowerCase()) ||
          d.name.toLowerCase().includes(cleanName)
      ) || db.drivers[0]
    )
  }, [db.drivers, user])

  // Attendance for today
  const today = ymd()
  const myAttendance = useMemo(() => {
    return db.attendances?.find((a) => a.driverId === matchedDriver?.id && a.date === today)
  }, [db.attendances, matchedDriver, today])

  const liveAttendance = useMemo(() => {
    return calculateDriverLiveAttendance(myAttendance, today)
  }, [myAttendance, today, wibNow])

  // Overtime Request aktif untuk driver ini
  const activeOvertime = useMemo(() => {
    return (db.overtimeRequests || []).find(
      (ot) =>
        ot.driverId === matchedDriver?.id &&
        (ot.status === 'APPROVED' || ot.status === 'ACTIVE' || ot.status === 'SUSPENDED')
    )
  }, [db.overtimeRequests, matchedDriver])

  // Riwayat Overtime khusus untuk driver ini
  const myOvertimeHistory = useMemo(() => {
    if (!matchedDriver) return []
    return (db.overtimeRequests || [])
      .filter((ot) => ot.driverId === matchedDriver.id)
      .slice()
      .reverse()
  }, [db.overtimeRequests, matchedDriver])

  // Cek apakah saat ini sudah di luar jam kerja reguler (06:00 - 15:00 WIB)
  const isPastRegulerShift = useMemo(() => {
    return wibNow.totalMins > 900 // Lewat dari 15:00 WIB
  }, [wibNow])

  // State Laporan Alasan Ketidaksesuaian Jam (Penangguhan Toleransi 15 Menit)
  const [showOtReportModal, setShowOtReportModal] = useState(false)
  const [otReportText, setOtReportText] = useState('')
  const [hasNotified15Min, setHasNotified15Min] = useState(false)

  // Hitung mundur sisa waktu lembur (Timer)
  const otCountdown = useMemo(() => {
    if (!activeOvertime) return null
    const [endH, endM] = activeOvertime.endOT.split(':').map(Number)
    const endTarget = new Date()
    endTarget.setHours(endH || 0, endM || 0, 0, 0)
    const diffMs = endTarget.getTime() - Date.now()
    const diffSeconds = Math.round(diffMs / 1000)
    const isPast = diffSeconds < 0
    const absSeconds = Math.abs(diffSeconds)
    const h = Math.floor(absSeconds / 3600)
    const m = Math.floor((absSeconds % 3600) / 60)
    const s = absSeconds % 60
    return {
      totalSeconds: diffSeconds,
      isPast,
      formatted: `${isPast ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      minutesLeft: Math.round(diffSeconds / 60),
    }
  }, [activeOvertime, wibNow])

  // Web Push Notification pengingat tepat 15 menit sebelum End OT
  useEffect(() => {
    if (!activeOvertime || !otCountdown || hasNotified15Min) return
    // Jika waktu tersisa antara 14 dan 15 menit
    if (otCountdown.minutesLeft <= 15 && otCountdown.minutesLeft >= 13) {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Pengingat Lembur Driver (15 Menit)', {
            body: `Halo ${matchedDriver?.name}, waktu Overtime Anda akan berakhir pada ${activeOvertime.endOT} WIB (15 menit lagi). Harap segera bersiap mengakhiri tugas.`,
            icon: '/favicon.ico',
          })
          setHasNotified15Min(true)
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification('Pengingat Lembur Driver (15 Menit)', {
                body: `Halo ${matchedDriver?.name}, waktu Overtime Anda akan berakhir pada ${activeOvertime.endOT} WIB (15 menit lagi).`,
                icon: '/favicon.ico',
              })
              setHasNotified15Min(true)
            }
          })
        }
      }
      notify(`⏰ Peringatan: Waktu Overtime Anda tersisa 15 menit lagi (Selesai: ${activeOvertime.endOT} WIB).`, 'error')
    }
  }, [activeOvertime, otCountdown, hasNotified15Min, matchedDriver])

  // Handler Driver tekan tombol "End Overtime"
  const handleEndOvertimeClick = () => {
    if (!activeOvertime) return
    const nowIso = new Date().toISOString()
    const now = new Date()
    const [endH, endM] = activeOvertime.endOT.split(':').map(Number)
    const planEnd = new Date()
    planEnd.setHours(endH || 0, endM || 0, 0, 0)
    const diffMinutes = Math.abs(Math.round((now.getTime() - planEnd.getTime()) / 60000))

    if (diffMinutes > 15) {
      // Melebihi toleransi 15 menit -> status dinyatakan Ditangguhkan dan wajib mengisi laporan alasan
      endOvertime(activeOvertime.id, nowIso)
      setShowOtReportModal(true)
      notify('Waktu penutupan lembur melebihi toleransi 15 menit! Status perjalanan DITANGGUHKAN. Mohon isi alasan ketidaksesuaian.', 'error', 8000)
    } else {
      endOvertime(activeOvertime.id, nowIso)
      notify('Overtime berhasil diselesaikan tepat waktu sesuai toleransi plan.')
    }
  }

  // Handler kirim alasan penangguhan ke Pak Hayu
  const handleSubmitDiscrepancyReport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOvertime) return
    if (!otReportText.trim()) {
      notify('Alasan ketidaksesuaian wajib diisi!', 'error')
      return
    }

    submitOvertimeReport(activeOvertime.id, otReportText.trim())
    notify('Laporan alasan telah terkirim ke Pak Hayu (SPV Kendaraan). Hitungan waktu lembur telah terhenti otomatis. Menunggu persetujuan.', undefined, 8000)
    setShowOtReportModal(false)
    setOtReportText('')
  }

  // Delay Justification Modal State
  const [delayModalTripId, setDelayModalTripId] = useState<string | null>(null)
  const [selectedDelayReason, setSelectedDelayReason] = useState<string>(DELAY_REASONS[0])
  const [customDelayReason, setCustomDelayReason] = useState<string>('')

  // Trips assigned to this driver that have passed SPV Kendaraan ACC (READY, ON_TRIP, DONE)
  const driverTrips = useMemo(() => {
    if (!matchedDriver) return []
    return db.trips.filter((t) => {
      const isMyTrip = t.driverId === matchedDriver.id
      const isApproved = ['READY', 'ON_TRIP', 'DONE'].includes(t.status)
      return isMyTrip && isApproved
    })
  }, [db.trips, matchedDriver])

  // Filter & Pagination State untuk Jadwal Siap Berangkat (READY)
  const [readySearch, setReadySearch] = useState('')
  const [readyDateFilter, setReadyDateFilter] = useState<'ALL' | 'TODAY'>('ALL')
  const [readyPage, setReadyPage] = useState(1)
  const [readyLimit, setReadyLimit] = useState(10)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const toggleExpandTrip = (id: string) => setExpandedTripId((prev) => (prev === id ? null : id))

  // Filter & Pagination State untuk Riwayat Tugas Selesai (DONE)
  const [historySearch, setHistorySearch] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLimit, setHistoryLimit] = useState(10)

  const rawUpcomingTrips = useMemo(() => {
    return driverTrips.filter((t) => t.status === 'READY')
  }, [driverTrips])

  const filteredUpcomingTrips = useMemo(() => {
    return rawUpcomingTrips.filter((t) => {
      if (readyDateFilter === 'TODAY' && t.date !== today) return false
      if (!readySearch.trim()) return true
      const q = readySearch.toLowerCase()
      const dest = (t.destination || '').toLowerCase()
      const req = (t.requesterName || '').toLowerCase()
      const plate = (t.plate || '').toLowerCase()
      const guest = (t.guest || '').toLowerCase()
      const id = (t.id || '').toLowerCase()
      return dest.includes(q) || req.includes(q) || plate.includes(q) || guest.includes(q) || id.includes(q)
    })
  }, [rawUpcomingTrips, readyDateFilter, readySearch, today])

  const totalUpcomingPages = Math.max(1, Math.ceil(filteredUpcomingTrips.length / readyLimit))
  const paginatedUpcomingTrips = useMemo(() => {
    const start = (readyPage - 1) * readyLimit
    return filteredUpcomingTrips.slice(start, start + readyLimit)
  }, [filteredUpcomingTrips, readyPage, readyLimit])

  const activeTrip = useMemo(() => {
    return driverTrips.find((t) => t.status === 'ON_TRIP')
  }, [driverTrips])

  const rawCompletedTrips = useMemo(() => {
    return driverTrips.filter((t) => t.status === 'DONE').slice().reverse()
  }, [driverTrips])

  const filteredCompletedTrips = useMemo(() => {
    return rawCompletedTrips.filter((t) => {
      if (!historySearch.trim()) return true
      const q = historySearch.toLowerCase()
      const dest = (t.destination || '').toLowerCase()
      const req = (t.requesterName || '').toLowerCase()
      const plate = (t.plate || '').toLowerCase()
      const id = (t.id || '').toLowerCase()
      return dest.includes(q) || req.includes(q) || plate.includes(q) || id.includes(q)
    })
  }, [rawCompletedTrips, historySearch])

  const totalHistoryPages = Math.max(1, Math.ceil(filteredCompletedTrips.length / historyLimit))
  const paginatedCompletedTrips = useMemo(() => {
    const start = (historyPage - 1) * historyLimit
    return filteredCompletedTrips.slice(start, start + historyLimit)
  }, [filteredCompletedTrips, historyPage, historyLimit])

  const upcomingTrips = rawUpcomingTrips
  const completedTrips = rawCompletedTrips

  // Calculate actual elapsed minutes for active trip
  const activeElapsedMinutes = useMemo(() => {
    if (!activeTrip || !activeTrip.timeGo) return 0
    return Math.max(0, Math.round((Date.now() - new Date(activeTrip.timeGo).getTime()) / 60000))
  }, [activeTrip, wibNow])

  const activePlanMinutes = activeTrip?.durationMin || activeTrip?.estimated_duration_minutes || 60
  const isActiveDelayed = activeTrip ? activeElapsedMinutes > activePlanMinutes : false

  // Trigger Delay Modal when ending trip or reporting delay
  const handleOpenEndTripModal = (tripId: string) => {
    const t = db.trips.find((x) => x.id === tripId)
    const planMins = t?.durationMin || t?.estimated_duration_minutes || 60
    const elapsedMins = t?.timeGo ? Math.max(0, Math.round((Date.now() - new Date(t.timeGo).getTime()) / 60000)) : 0
    
    // If delayed, prompt delay reason
    if (elapsedMins > planMins || t?.delayReason) {
      setSelectedDelayReason(t?.delayReason || DELAY_REASONS[0])
      setDelayModalTripId(tripId)
    } else {
      endDriverTrip(tripId)
      notify('Perjalanan selesai tepat waktu dan tercatat.')
    }
  }

  const handleConfirmDelayAndFinish = () => {
    if (!delayModalTripId) return
    const finalReason = selectedDelayReason === 'Lainnya' ? customDelayReason.trim() || 'Alasan khusus driver' : selectedDelayReason
    endDriverTrip(delayModalTripId, finalReason)
    notify(`Perjalanan selesai dengan catatan keterlambatan: ${finalReason}`)
    setDelayModalTripId(null)
    setCustomDelayReason('')
  }

  // Calculate driver personal metrics
  const totalKm = useMemo(() => {
    return driverTrips.reduce((acc, t) => acc + (t.distance_km || 0), 0)
  }, [driverTrips])

  const totalHours = useMemo(() => {
    const mins = driverTrips.reduce((acc, t) => acc + (t.durationMin || 60), 0)
    return (mins / 60).toFixed(1)
  }, [driverTrips])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Jadwal Tugas & Absensi Driver" 
        desc={`Portal resmi penugasan armada & absensi dinas · ${user.name}`} 
      />

      {/* OVERTIME (LEMBUR) BANNER & COUNTDOWN TIMER - UNGU KHUSUS */}
      {activeOvertime && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-[#2a0e4a] via-[#1c0b33] to-[#0d041a] p-6 text-white shadow-2xl animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-500/30 border border-purple-400/50 px-3 py-1 text-xs font-extrabold text-purple-200 flex items-center gap-1.5 shadow-sm">
                  <Timer size={14} className="text-purple-300 animate-spin" />
                  STATUS: OVERTIME AKTIF
                </span>
                <span className="rounded bg-black/40 px-2.5 py-1 text-xs font-mono text-purple-200 border border-purple-500/20">
                  Target: {activeOvertime.startOT} – {activeOvertime.endOT} WIB
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                Penugasan Lembur Berjalan
              </h3>
              <p className="text-xs text-purple-200/80 max-w-xl">
                Alasan: <strong>{activeOvertime.reason}</strong> · Disetujui oleh Pak Hayu (SPV Kendaraan).
              </p>
            </div>

            {/* Timer Countdown Card */}
            <div className="shrink-0 rounded-2xl bg-black/60 border border-purple-500/30 p-4 text-center min-w-[240px]">
              <p className="text-[11px] font-semibold text-purple-300 mb-1">
                {otCountdown?.isPast ? 'Waktu Lembur Terlewati' : 'Hitung Mundur Sisa Waktu'}
              </p>
              <div className={`font-mono text-3xl font-black tracking-wider ${
                otCountdown?.isPast
                  ? 'text-rose-400 animate-pulse'
                  : (otCountdown?.minutesLeft || 0) <= 15
                  ? 'text-amber-300 animate-pulse'
                  : 'text-purple-200'
              }`}>
                {otCountdown?.formatted || '00:00:00'}
              </div>
              <p className="text-[10px] text-purple-300/60 mt-1">
                Toleransi penyelesaian: ±15 Menit dari {activeOvertime.endOT} WIB
              </p>

              <button
                type="button"
                onClick={handleEndOvertimeClick}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/50 transition active:scale-[.98]"
              >
                <Square size={14} />
                Akhiri Lembur (End OT)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP SECTION: KARTU ABSENSI & OVERTIME REAL-TIME */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c2619] via-[#06180f] to-black p-6 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pill label="Absensi Harian Driver" tone="green" />
              <span className="font-mono text-xs text-[#8fa99b] bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                WIB: <span className="font-bold text-white">{wibTimeStr || '—:—:— WIB'}</span>
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Halo, {user.name} 👋
            </h2>
            <p className="text-xs text-[#8fa99b] max-w-xl">
              Jam kerja reguler dinas: <span className="text-emerald-300 font-semibold">06:00 - 15:00 WIB</span>. 
              Fitur <strong>Check In</strong> berfungsi mencatat kehadiran. Lembur (Overtime) diproses terpisah atas permohonan <strong>Admin Lobby</strong> dan persetujuan <strong>SPV Kendaraan (Pak Hayu)</strong>.
            </p>
          </div>

          {/* Attendance Action Box */}
          <div className="shrink-0 rounded-2xl bg-black/60 border border-white/10 p-4 min-w-[280px]">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-[#8fa99b]">Status Kehadiran / Dinas:</span>
              {activeOvertime ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/25 text-purple-200 border border-purple-400/50 flex items-center gap-1 animate-pulse">
                  ⏰ OVERTIME AKTIF
                </span>
              ) : liveAttendance.status === 'BELUM_HADIR' ? (
                isPastRegulerShift ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⏱️ Di Luar Jam Kerja
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    ⚪ Belum Hadir
                  </span>
                )
              ) : liveAttendance.status === 'HADIR' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  🟢 Hadir (Masuk {fmtTime(liveAttendance.clockIn)} WIB)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  🏁 Sudah Pulang
                </span>
              )}
            </div>

            {/* Jika sedang dalam Overtime Aktif, tampilkan tombol Akhiri Overtime */}
            {activeOvertime ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-purple-500/20 border border-purple-500/40 p-2.5 text-[11px] text-purple-200 space-y-1">
                  <div className="font-bold flex items-center justify-between text-purple-100">
                    <span>Target OT: {activeOvertime.startOT} – {activeOvertime.endOT} WIB</span>
                    <span className="font-mono text-purple-300">{otCountdown?.formatted}</span>
                  </div>
                  <p className="text-[10px] text-purple-300/80">
                    Alasan: {activeOvertime.reason}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEndOvertimeClick}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 transition active:scale-[.98]"
                >
                  <Square size={16} />
                  Akhiri Overtime (End OT)
                </button>
              </div>
            ) : liveAttendance.status === 'BELUM_HADIR' ? (
              isPastRegulerShift ? (
                <div className="space-y-2 text-center">
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-800 text-gray-500 font-bold text-xs cursor-not-allowed border border-white/5"
                  >
                    <CheckCircle2 size={16} />
                    Clock In Dinonaktifkan (Lewat 15:00 WIB)
                  </button>
                  <p className="text-[10px] text-amber-300/80">
                    Waktu reguler shift telah berakhir. Hubungi Admin Lobby jika ada penugasan lembur.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    clockInDriver(matchedDriver.id)
                    notify(`Absensi HADIR berhasil tercatat pada ${fmtTime(new Date().toISOString())} WIB`)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition active:scale-[.98]"
                >
                  <CheckCircle2 size={18} />
                  Clock In (Hadir Kerja)
                </button>
              )
            ) : liveAttendance.status === 'HADIR' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    clockOutDriver(matchedDriver.id)
                    notify(`Absensi PULANG berhasil tercatat pada ${fmtTime(new Date().toISOString())} WIB`)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg transition active:scale-[.98] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-900/40"
                >
                  <Square size={16} />
                  Clock Out (Selesai Dinas & Pulang)
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-2">
                <div className="text-xs text-[#8fa99b]">
                  Dinas reguler hari ini telah selesai: <br />
                  <span className="text-white font-mono font-medium">
                    {fmtTime(liveAttendance.clockIn)} → {fmtTime(liveAttendance.clockOut)} WIB
                  </span>
                </div>
                {!isPastRegulerShift && (
                  <button
                    type="button"
                    onClick={() => {
                      clockInDriver(matchedDriver.id)
                      notify('Status absensi diaktifkan kembali.')
                    }}
                    className="text-[11px] text-[#8fa99b] hover:text-white underline"
                  >
                    Clock In Ulang Jika Masih Bertugas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Counter Summary */}
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <div className="text-center">
            <div className="text-xl font-extrabold text-[#bef264]">{upcomingTrips.length}</div>
            <div className="text-[10px] text-[#8fa99b]">Siap Berangkat</div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-xl font-extrabold text-amber-400">{activeTrip ? 1 : 0}</div>
            <div className="text-[10px] text-[#8fa99b]">Sedang Berjalan</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold text-sky-400">{completedTrips.length}</div>
            <div className="text-[10px] text-[#8fa99b]">Telah Selesai</div>
          </div>
        </div>
      </div>

      {/* Stats Beban Kerja Driver Mandiri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-white/10 bg-white/[0.03]">
          <div className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] text-[#8fa99b] uppercase font-bold tracking-wider">Total Akumulasi Jarak Driver</div>
              <div className="text-2xl font-extrabold text-white">{totalKm} <span className="text-xs font-normal text-[#8fa99b]">KM</span></div>
              <div className="text-[11px] text-[#8fa99b] mt-0.5">Tercatat secara paralel pada profil pribadi driver</div>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/[0.03]">
          <div className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] text-[#8fa99b] uppercase font-bold tracking-wider">Total Durasi Operasional</div>
              <div className="text-2xl font-extrabold text-white">{totalHours} <span className="text-xs font-normal text-[#8fa99b]">Jam Kerja</span></div>
              <div className="text-[11px] text-[#8fa99b] mt-0.5">Termasuk waktu tunggu dan durasi perjalanan</div>
            </div>
          </div>
        </Card>
      </div>

      {/* TUGAS AKTIF SAAT INI (ON_TRIP) */}
      {activeTrip && (
        <Card 
          title="Tugas Sedang Berjalan (ON TRIP)"
          subtitle="Kendaraan saat ini berada di perjalanan dinas"
          className="border border-amber-500/40 bg-amber-950/20"
        >
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-amber-500/30">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Pill label="DALAM PERJALANAN" tone="amber" />
                  <span className="text-xs text-[#8fa99b]">Kode Booking: <span className="font-mono text-white">{activeTrip.id}</span></span>
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>{activeTrip.origin || 'PT. JAI'}</span>
                  <span className="text-[#8fa99b]">→</span>
                  <span>{activeTrip.destination}</span>
                </div>
                <div className="text-xs text-[#8fa99b] flex flex-wrap items-center gap-4">
                  <span>🚗 {activeTrip.isOtherVehicle ? activeTrip.otherVehicleName || 'Mobil Luar' : activeTrip.plate}</span>
                  <span>⏰ Berangkat: {fmtTime(activeTrip.timeGo)} WIB</span>
                  <span>⏱️ Durasi Berjalan: <strong className="text-white">{activeElapsedMinutes} Menit</strong> (Rencana: {activePlanMinutes}m)</span>
                </div>
              </div>

              {/* Action Buttons for Active Trip */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEndTripModal(activeTrip.id)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-lg shadow-amber-900/40 transition active:scale-[.98]"
                >
                  <Square size={16} />
                  Selesai Perjalanan (End Trip)
                </button>

                {isActiveDelayed && !activeTrip.delayReason && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDelayReason(DELAY_REASONS[0])
                      setDelayModalTripId(activeTrip.id)
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition"
                  >
                    <AlertTriangle size={14} />
                    Input Alasan Keterlambatan (+{activeElapsedMinutes - activePlanMinutes}m)
                  </button>
                )}
              </div>
            </div>

            {/* Delay Alert Banner if Active Trip is Running Late */}
            {isActiveDelayed && (
              <div className="rounded-xl bg-red-950/40 border border-red-500/40 p-4 text-xs text-red-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-sm">Peringatan Keterlambatan (Actual &gt; Plan)</div>
                  <div>
                    Durasi riil perjalanan ({activeElapsedMinutes} menit) telah melampaui estimasi rencana ({activePlanMinutes} menit). 
                    {activeTrip.delayReason ? (
                      <div className="mt-1 text-emerald-300">
                        Alasan terlapor: <strong>{activeTrip.delayReason}</strong>
                      </div>
                    ) : (
                      <div className="mt-1 text-amber-300">
                        Saat perjalanan diselesaikan, sistem akan meminta konfirmasi alasan keterlambatan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* DAFTAR TUGAS SIAP BERANGKAT (READY) */}
      <Card 
        title="Jadwal Siap Berangkat (Disetujui SPV Kendaraan)"
        subtitle="Dapat dimulai langsung oleh Driver atau via Clearance Gerbang Security"
        className="border border-white/10 bg-white/[0.02]"
        action={
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>Tampil:</span>
            <select
              value={readyLimit}
              onChange={(e) => {
                setReadyLimit(Number(e.target.value))
                setReadyPage(1)
              }}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={20}>20 baris</option>
            </select>
          </div>
        }
      >
        <div className="p-5 space-y-4">
          {/* Toolbar Pencarian & Filter Tanggal Hari Ini */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Cari tujuan, pemohon, plat mobil, atau ID..."
                value={readySearch}
                onChange={(e) => {
                  setReadySearch(e.target.value)
                  setReadyPage(1)
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="inline-flex rounded-lg p-0.5 bg-black/60 border border-white/10 text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setReadyDateFilter('ALL')
                  setReadyPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  readyDateFilter === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Semua Jadwal ({rawUpcomingTrips.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setReadyDateFilter('TODAY')
                  setReadyPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  readyDateFilter === 'TODAY'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Hari Ini ({rawUpcomingTrips.filter((t) => t.date === today).length})
              </button>
            </div>
          </div>

          {filteredUpcomingTrips.length === 0 ? (
            <div className="text-center py-12 text-[#8fa99b] border border-dashed border-white/10 rounded-xl">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-[#8fa99b]/60" />
              <p className="font-semibold text-white">Tidak ada jadwal penugasan yang sesuai filter.</p>
              <p className="text-xs text-[#8fa99b] mt-1">
                {readySearch || readyDateFilter === 'TODAY' 
                  ? 'Coba ganti kata kunci pencarian atau ubah filter ke "Semua Jadwal".'
                  : 'Jadwal akan muncul setelah Admin memasukkan penugasan dan disetujui resmi oleh SPV Kendaraan.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedUpcomingTrips.map((trip) => {
                  const isToday = trip.date === today
                  const isExpanded = expandedTripId === trip.id
                  const vehicleObj = db.vehicles.find((v) => v.plate === trip.plate)
                  const fuelEst = calculateEstimatedFuel(trip.distance_km, vehicleObj)

                  return (
                    <div 
                      key={trip.id} 
                      className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-3.5 hover:border-[#a3e635]/40 transition relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top: Status Badges & Kode Booking */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Pill label="Siap Jalan (ACC SPV)" tone="green" />
                            {trip.driverOnly && (
                              <Pill label="Hanya Driver" tone="amber" />
                            )}
                            {trip.isOtherVehicle && (
                              <Pill label="Mobil Lain" tone="purple" />
                            )}
                          </div>
                          <span className="text-right text-xs text-[#8fa99b] font-mono shrink-0">
                            {trip.id}
                          </span>
                        </div>

                        {/* Tanggal & Jam Keberangkatan Prominen */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border ${
                            isToday 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/20' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <Calendar size={13} className="shrink-0" />
                            <span>{fmtDate(trip.date)}</span>
                            {isToday && (
                              <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/40 text-white font-extrabold tracking-wider uppercase">
                                Hari Ini
                              </span>
                            )}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-semibold">
                            <Clock size={13} className="shrink-0 text-emerald-400" />
                            <span>Rencana: <b>{trip.estDeparture || '08:00'}</b> {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB</span>
                          </span>
                        </div>

                        {/* Rute Asal -> Tujuan */}
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-[#a3e635] shrink-0" />
                            <span>{trip.origin || 'PT. JAI'}</span>
                            <span className="text-[#8fa99b]">→</span>
                            <span>{trip.destination}</span>
                          </h3>
                          {trip.destinations && trip.destinations.length > 1 && (
                            <p className="text-[11px] text-emerald-300/80 mt-1 pl-5">
                              Rute Multi-Drop: {trip.destinations.join(' ➔ ')}
                            </p>
                          )}
                        </div>

                        {/* Detail Penugasan & Mobil */}
                        <div className="space-y-2 text-xs text-[#cad6cf] bg-white/[0.03] p-3 rounded-lg border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[#8fa99b]">Kendaraan:</span>
                            <span className="font-bold text-[#bef264] flex items-center gap-1.5">
                              <span>{trip.isOtherVehicle ? trip.otherVehicleName || 'Mobil Luar' : trip.plate}</span>
                              {vehicleObj?.type && !trip.isOtherVehicle && (
                                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                                  {vehicleObj.type}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#8fa99b]">Pemohon / Dept:</span>
                            <span className="font-medium text-white">{trip.requesterName} ({trip.dept}{trip.section ? ` - ${trip.section}` : ''})</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#8fa99b]">Keperluan:</span>
                            <span className="font-medium text-white">{trip.purpose || trip.guest || trip.category}</span>
                          </div>

                          {/* Estimasi Jarak & Estimasi BBM */}
                          {trip.distance_km != null && trip.distance_km > 0 && (
                            <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px]">
                              <span className="text-[#8fa99b] flex items-center gap-1">
                                <Navigation size={12} className="text-sky-400" /> Jarak Tempuh:
                              </span>
                              <span className="font-medium text-sky-200">
                                ~{trip.distance_km} KM
                              </span>
                            </div>
                          )}

                          {fuelEst.liters > 0 && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8fa99b] flex items-center gap-1">
                                <Fuel size={12} className="text-amber-400" /> Est. BBM:
                              </span>
                              <span className="font-semibold text-amber-300">
                                ~{fuelEst.liters} Liter ({fuelEst.efficiency} km/L)
                              </span>
                            </div>
                          )}

                          {trip.adminNote && (
                            <div className="pt-2 border-t border-white/10 text-white">
                              <span className="text-[#8fa99b] font-semibold block mb-0.5 text-[11px]">Catatan Admin:</span>
                              <div className="bg-amber-500/10 p-2 rounded text-[11px] text-amber-200 border border-amber-500/20">
                                {trip.adminNote}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Penumpang List & Toggle Detail Lengkap */}
                        {!trip.driverOnly && trip.passengers && trip.passengers.length > 0 ? (
                          <div className="text-xs">
                            <span className="text-[#8fa99b] font-medium flex items-center gap-1 mb-1.5">
                              <Users className="h-3.5 w-3.5 text-emerald-400" /> Penumpang ({trip.passengers.length} Orang):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {trip.passengers.map((p, idx) => (
                                <span key={idx} className="bg-white/5 text-white px-2 py-0.5 rounded text-[11px] border border-white/10">
                                  {p.name} ({p.dept})
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : trip.driverOnly ? (
                          <div className="text-[11px] text-amber-300 font-medium bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                            <Info size={13} className="shrink-0" />
                            <span>Pengantaran logistik/dokumen (Driver Only - Tanpa penumpang)</span>
                          </div>
                        ) : null}
                      </div>

                      {/* START TRIP BUTTON (Driver App Self Start) */}
                      <div className="pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            startDriverTrip(trip.id)
                            notify(`Perjalanan ${trip.plate} dimulai oleh Driver pada ${fmtTime(new Date().toISOString())} WIB`)
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition active:scale-[.98]"
                        >
                          <Play size={15} fill="currentColor" />
                          Mulai Perjalanan (Start Trip)
                        </button>
                        <p className="text-[10px] text-[#8fa99b] text-center mt-1">
                          Klik saat berangkat (termasuk rute luar yang tidak lewat gerbang pabrik)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Footer Siap Berangkat */}
              {totalUpcomingPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/70">
                  <span>
                    Menampilkan <b>{(readyPage - 1) * readyLimit + 1}</b> - <b>{Math.min(readyPage * readyLimit, filteredUpcomingTrips.length)}</b> dari <b>{filteredUpcomingTrips.length}</b> jadwal
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={readyPage <= 1}
                      onClick={() => setReadyPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2 font-medium text-white">
                      Hal {readyPage} / {totalUpcomingPages}
                    </span>
                    <button
                      type="button"
                      disabled={readyPage >= totalUpcomingPages}
                      onClick={() => setReadyPage((p) => Math.min(totalUpcomingPages, p + 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* RIWAYAT TUGAS SELESAI */}
      {completedTrips.length > 0 && (
        <Card 
          title="Riwayat Tugas Selesai" 
          subtitle="Daftar perjalanan dinas yang telah tuntas dilaksanakan"
          className="border border-white/10 bg-white/[0.02]"
          action={
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>Tampil:</span>
              <select
                value={historyLimit}
                onChange={(e) => {
                  setHistoryLimit(Number(e.target.value))
                  setHistoryPage(1)
                }}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
              </select>
            </div>
          }
        >
          <div className="p-4 space-y-3">
            {/* Search Riwayat */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Cari riwayat perjalanan berdasarkan tujuan, pemohon, plat..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value)
                  setHistoryPage(1)
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="divide-y divide-white/5">
              {paginatedCompletedTrips.map((trip) => (
                <div key={trip.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-emerald-300 font-bold">{trip.id}</span>
                      <span>•</span>
                      <span>{trip.origin || 'PT. JAI'} → {trip.destination}</span>
                      <Pill label="Selesai" tone="gray" />
                      {trip.delayReason && (
                        <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          Catatan: {trip.delayReason}
                        </span>
                      )}
                    </div>
                    <div className="text-[#8fa99b] text-[11px] mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{fmtDate(trip.date)}</span>
                      <span>•</span>
                      <span className="text-emerald-300 font-bold">{trip.plate}</span>
                      <span>•</span>
                      <span>{trip.distance_km || 0} KM ({trip.durationMin || 60} Menit)</span>
                      {trip.timeGo && trip.timeBack && (
                        <span className="text-white/60 font-mono">
                          ({fmtTime(trip.timeGo)} - {fmtTime(trip.timeBack)} WIB)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[#8fa99b] text-[11px] shrink-0">
                    <span className="text-white font-medium">{trip.requesterName}</span> ({trip.dept})
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer Riwayat */}
            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/70">
                <span>
                  Menampilkan <b>{(historyPage - 1) * historyLimit + 1}</b> - <b>{Math.min(historyPage * historyLimit, filteredCompletedTrips.length)}</b> dari <b>{filteredCompletedTrips.length}</b> riwayat
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-medium text-white">
                    Hal {historyPage} / {totalHistoryPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyPage >= totalHistoryPages}
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* RIWAYAT OVERTIME (LEMBUR) DRIVER */}
      {myOvertimeHistory.length > 0 && (
        <Card 
          title="Riwayat Overtime (Lembur)" 
          subtitle="Daftar pengajuan permohonan lembur dan status persetujuan dari SPV Kendaraan"
          className="border border-purple-500/20 bg-purple-950/[0.05]"
        >
          <div className="divide-y divide-white/5 p-4">
            {myOvertimeHistory.map((ot) => (
              <div key={ot.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-purple-300 font-bold">{ot.id}</span>
                    <span>•</span>
                    <span>{ot.date} ({ot.startOT} – {ot.endOT} WIB)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      ot.status === 'APPROVED' || ot.status === 'ACTIVE'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : ot.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : ot.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : ot.status === 'WAITING_REPORT'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {ot.status === 'APPROVED' || ot.status === 'ACTIVE'
                        ? 'Aktif Berjalan'
                        : ot.status === 'COMPLETED'
                        ? 'Selesai'
                        : ot.status === 'PENDING'
                        ? 'Menunggu ACC Pak Hayu'
                        : ot.status === 'WAITING_REPORT'
                        ? 'Laporan Ditangguhkan'
                        : 'Ditolak'}
                    </span>
                  </div>
                  <p className="text-[#8fa99b] text-[11px]">
                    Alasan: <span className="text-white font-medium">{ot.reason}</span>
                  </p>
                  {ot.actualEnd && (
                    <p className="text-[10px] text-purple-300/80">
                      Selesai aktual: {fmtTime(ot.actualEnd)} WIB
                    </p>
                  )}
                  {ot.driverReport && (
                    <p className="text-[10px] text-rose-300">
                      Laporan kendala jam: <em>"{ot.driverReport}"</em>
                    </p>
                  )}
                </div>
                <div className="text-right text-[#8fa99b] text-[11px] shrink-0">
                  <div>Diajukan: {ot.requestedByName}</div>
                  {ot.approvedBy && (
                    <div className="text-emerald-400 font-medium">ACC: {ot.approvedBy}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* POPUP MODAL: REASON FOR DELAY (ALASAN KETERLAMBATAN) */}
      {delayModalTripId && (
        <ModalPortal onClose={() => setDelayModalTripId(null)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0f1712] p-6 text-white shadow-2xl space-y-4 max-h-[88vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Alasan Keterlambatan (Delay Justification)</h3>
                <p className="text-xs text-[#8fa99b]">
                  Durasi aktual melebihi jadwal rencana. Pilih alasan untuk dokumentasi sistem:
                </p>
              </div>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-2 pt-2">
              {DELAY_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-xs ${
                    selectedDelayReason === reason
                      ? 'bg-amber-500/20 border-amber-400 text-white font-semibold'
                      : 'bg-white/5 border-white/10 text-[#cad6cf] hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="delayReason"
                    value={reason}
                    checked={selectedDelayReason === reason}
                    onChange={() => setSelectedDelayReason(reason)}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-400"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {selectedDelayReason === 'Lainnya' && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Ketik detail alasan keterlambatan..."
                  value={customDelayReason}
                  onChange={(e) => setCustomDelayReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder-gray-400 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDelayModalTripId(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#8fa99b] hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelayAndFinish}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-900/40 transition"
              >
                Simpan & Selesaikan Perjalanan
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* POPUP MODAL: LAPORAN PENANGGUHAN LEMBUR (TOLERANSI 15 MENIT) */}
      {showOtReportModal && (
        <ModalPortal onClose={() => setShowOtReportModal(false)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/50 bg-[#160b14] p-6 text-white shadow-2xl space-y-4 max-h-[88vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Status Perjalanan Ditangguhkan</h3>
                <p className="text-xs text-rose-300/80">
                  Waktu selesai aktual melebihi batas toleransi 15 menit dari Plan Overtime.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200 space-y-1">
              <p className="font-semibold text-rose-300">Pemberitahuan Sistem:</p>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Waktu lembur Anda telah <strong>otomatis terhenti</strong>. Untuk menormalkan kembali status Anda dan kendaraan, Anda wajib mengisi laporan penjelasan alasan ketidaksesuaian jam aktual untuk dikirimkan dan diverifikasi oleh <strong>Pak Hayu</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmitDiscrepancyReport} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-rose-200 mb-1">
                  Alasan Ketidaksesuaian Jam Aktual vs Plan OT <span className="text-rose-400">*Wajib</span>
                </label>
                <textarea
                  rows={4}
                  value={otReportText}
                  onChange={(e) => setOtReportText(e.target.value)}
                  placeholder="Jelaskan kendala di lapangan (misal: antrean pengisian bahan bakar, menunggu barang/dokumen tambahan dari pemohon, kondisi jalanan macet total)..."
                  className="w-full rounded-xl border border-rose-500/40 bg-black/60 p-3 text-xs text-white placeholder-rose-300/40 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition"
                >
                  Kirim Laporan ke Pak Hayu
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

