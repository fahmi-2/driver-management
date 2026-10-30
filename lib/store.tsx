'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { normalizeDestinations } from './geo'

export type Category = 'Dinas' | 'Non-Dinas'
export type TripStatus = 'WAITING_SPV' | 'WAITING_ASSIGN' | 'WAITING_POOL_SPV' | 'READY' | 'ON_TRIP' | 'DONE' | 'REJECTED'
export type CouponStatus = 'NONE' | 'VOID' | 'CLAIMABLE' | 'PR_PENDING' | 'PR_PROGRESS' | 'PAID'

export type ShiftType = 'Pagi (07:00 - 15:00)' | 'Siang (15:00 - 23:00)' | 'Malam (23:00 - 07:00)' | 'General (08:00 - 17:00)'

export type Driver = {
  id: string
  name: string
  onLeave: boolean
  leaveReplacementName?: string // Nama pengganti sementara saat cuti
  shift?: string
  phone?: string
  defaultPlate?: string
  simType?: string
}
export type VehicleCategory = 'Mobil Operasional' | 'Mobil Expat' | 'Mobil Sewa'
export type VehicleStatus = 'Active' | 'Maintenance'
export type FuelType = 'Bensin' | 'Diesel' | 'Hybrid'
export type Vehicle = {
  plate: string
  type: string
  status?: VehicleStatus
  category?: VehicleCategory
  capacity?: number
  dedicatedUser?: string
  fuelEfficiency?: number // km per 1 liter bensin/solar
  fuelType?: FuelType | string
}

// Kamus rasio konsumsi BBM default berdasarkan tipe/model kendaraan (km per 1 liter)
export function getDefaultFuelEfficiency(type?: string): number {
  if (!type) return 11
  const t = type.toUpperCase()
  if (t.includes('HYBRID')) return 20 // Zenix Hybrid: 20 km / 1 liter
  if (t.includes('DIESEL')) return 9 // Diesel: 9 km / 1 liter
  if (t.includes('ZENIX')) return 15 // Zenix: 15 km / 1 liter
  if (t.includes('AVANZA')) return 11 // Avanza: 11 km / 1 liter
  if (t.includes('REBORN')) return 11 // Innova Reborn Bensin default 11 atau Reborn Diesel 9
  return 11 // Default 11 km / 1 liter
}

// Menghitung estimasi liter BBM terpakai berdasarkan jarak tempuh KM dan kendaraan
export function calculateEstimatedFuel(distanceKm?: number, vehicle?: Vehicle | null): {
  liters: number
  efficiency: number
  formatted: string
} {
  const km = distanceKm && distanceKm > 0 ? distanceKm : 0
  const efficiency = vehicle?.fuelEfficiency && vehicle.fuelEfficiency > 0
    ? vehicle.fuelEfficiency
    : getDefaultFuelEfficiency(vehicle?.type)

  const liters = km > 0 && efficiency > 0 ? Number((km / efficiency).toFixed(1)) : 0
  return {
    liters,
    efficiency,
    formatted: km > 0 ? `${liters} Liter (~${efficiency} km/L)` : '—',
  }
}

export type Passenger = {
  name: string
  nik?: string
  dept: string
}

export type Trip = {
  id: string
  date: string // YYYY-MM-DD
  requesterUser: string
  requesterName: string
  requesterNik?: string
  dept: string
  section?: string
  golongan?: number // Golongan karyawan pemohon utama (1, 2, 3, 4)
  approverRole?: 'SSPV' | 'Manager' // Ditentukan otomatis berdasarkan golongan
  approverEmail?: string // Email penerima notifikasi persetujuan (Manager/SSPV)
  category: Category
  guest: string
  origin?: string // Titik awal (default 'PT. JAI')
  destination: string
  destinations?: string[] // Multi-drop route destinations
  returnToOrigin?: boolean // Apakah kembali ke titik awal (PP) atau sekali jalan (Drop-off)
  passengers?: Passenger[] // Multi-passenger list
  driverOnly?: boolean // Opsi hanya driver (antar/jemput dokumen/barang tanpa penumpang)
  isOtherVehicle?: boolean // Opsi "Mobil Lain" (driver bawa mobil di luar armada master)
  otherVehicleName?: string // Nama mobil manajer / mobil luar
  blockedDefaultPlate?: string // Plat mobil default driver yang terblokir
  blockedReason?: string // Keterangan blokir (misal: "Driver sedang [Catatan]")
  isLeaveReplacement?: boolean // Trip dibuat selama penggantian cuti (tidak akumulasi beban sopir)
  replacementDriverName?: string // Nama sementara pengganti sopir cuti
  purpose: string
  estDeparture: string // HH:mm
  estReturn?: string // HH:mm
  distance_km?: number
  estimated_duration_minutes?: number
  status: TripStatus
  isEdited?: boolean // Flag penanda pengajuan telah direvisi oleh pemohon
  editedAt?: string // Timestamp revisi terakhir
  spvName: string // Approver SPV Departemen
  spvEmail?: string
  spvAt?: string
  spvNote?: string
  poolSpvName?: string // Approver Tahap 2: SPV Kendaraan / Pool GA
  poolSpvAt?: string
  poolSpvNote?: string
  adminNote?: string // Optional note from Admin Utama during approval/assignment
  rejectReason?: string // Mandatory reason when rejected by Admin / SPV
  delayReason?: string // Alasan keterlambatan jika aktual > rencana
  driverId?: string
  plate?: string
  timeGo?: string // ISO
  timeBack?: string // ISO
  securityGo?: string
  securityBack?: string
  durationMin?: number
  coupon: CouponStatus
  claimedAt?: string
  paidAt?: string
  paidBy?: string
  prNumber?: string // Nomor Purchase Request (PR) manual
  prCreatedAt?: string // Tanggal PR dibuat
  prCreatedBy?: string
}

// Status kehadiran murni untuk mencatat kehadiran driver (tidak bercampur dengan lembur)
export type DriverAttendanceStatus = 'BELUM_HADIR' | 'HADIR' | 'PULANG'

export type DriverAttendance = {
  driverId: string
  date: string // YYYY-MM-DD
  clockIn?: string // ISO timestamp
  clockOut?: string // ISO timestamp
  status: DriverAttendanceStatus
  overtimeMinutes?: number
}

// --- Overtime Request (Lembur Driver) ---
export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'WAITING_REPORT' | 'COMPLETED' | 'REJECTED'

export type OvertimeRequest = {
  id: string
  driverId: string
  driverName: string
  requestedBy: string // Username admin yang mengajukan
  requestedByName: string
  date: string // YYYY-MM-DD
  startOT: string // HH:mm
  endOT: string // HH:mm
  reason: string
  status: OvertimeStatus
  approvedBy?: string
  approvedAt?: string
  actualEnd?: string // ISO timestamp ketika driver menekan "End"
  isSuspended?: boolean // Jika melebihi toleransi 15 menit
  driverReport?: string // Alasan ketidaksesuaian dari driver
  reportApprovedAt?: string
  createdAt: string // ISO timestamp
}

type DB = {
  drivers: Driver[]
  vehicles: Vehicle[]
  trips: Trip[]
  attendances?: DriverAttendance[]
  overtimeRequests?: OvertimeRequest[]
}

export const NOON_HOUR = 12

// ---------- helpers ----------
export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fmtTime = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
export const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDur = (min?: number) => (min == null ? '—' : `${Math.floor(min / 60)}j ${String(min % 60).padStart(2, '0')}m`)
export const couponFromBack = (iso: string): CouponStatus => (new Date(iso).getHours() >= NOON_HOUR ? 'CLAIMABLE' : 'VOID')

/** Helper waktu WIB (Asia/Jakarta, UTC+7) untuk absensi & lembur */
export function getWibNow(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const [hStr, mStr, sStr] = formatter.format(date).split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const s = parseInt(sStr, 10)
  const totalMins = h * 60 + m
  // Jam kerja standar strictly 06:00 - 15:00 WIB.
  // Jika lewat jam 15:00 WIB (mulai 15:01, totalMins >= 901) -> OVERTIME!
  const isPast1500 = totalMins >= 901
  return { h, m, s, totalMins, isPast1500, timeStr: `${hStr}:${mStr}` }
}

/** Hitung status live kehadiran murni supir (HADIR / BELUM_HADIR / PULANG) */
export function calculateDriverLiveAttendance(
  att?: DriverAttendance,
  targetDate = ymd()
): {
  status: DriverAttendanceStatus
  clockIn?: string
  clockOut?: string
  overtimeMinutes: number
  isOvertime: boolean
} {
  if (!att || !att.clockIn) {
    return {
      status: 'BELUM_HADIR',
      clockIn: undefined,
      clockOut: undefined,
      overtimeMinutes: 0,
      isOvertime: false,
    }
  }

  // Jika sudah Clock Out
  if (att.clockOut) {
    return {
      status: 'PULANG',
      clockIn: att.clockIn,
      clockOut: att.clockOut,
      overtimeMinutes: att.overtimeMinutes || 0,
      isOvertime: (att.overtimeMinutes || 0) > 0,
    }
  }

  // Jika masih aktif hadir hari ini
  return {
    status: 'HADIR',
    clockIn: att.clockIn,
    clockOut: undefined,
    overtimeMinutes: 0,
    isOvertime: false,
  }
}

export const STATUS_LABEL: Record<TripStatus, string> = {
  WAITING_SPV: 'Menunggu SPV Dept (Tahap 1)',
  WAITING_ASSIGN: 'Menunggu Alokasi Armada',
  WAITING_POOL_SPV: 'Pending SPV Kendaraan (Tahap 2)',
  READY: 'Siap Berangkat (ACC Final)',
  ON_TRIP: 'Sedang Bertugas',
  DONE: 'Selesai',
  REJECTED: 'Ditolak',
}
export const COUPON_LABEL: Record<CouponStatus, string> = {
  NONE: '—',
  VOID: 'VOID',
  CLAIMABLE: 'Siap Diajukan',
  PR_PENDING: 'Belum Dibuat PR',
  PR_PROGRESS: 'Sedang Dibuat PR',
  PAID: 'Created',
}

// Kirim email notifikasi approval via API route server (/api/notify). Error hanya di-log,
// tidak menggagalkan pengajuan karena data sudah tersimpan di database.
export async function notifyApprover(
  tripId: string,
  options?: { isEdit?: boolean; actionType?: 'reschedule'; rescheduleChanges?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        isEdit: options?.isEdit,
        actionType: options?.actionType,
        rescheduleChanges: options?.rescheduleChanges,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.ok === false) {
      console.error('Notifikasi email gagal:', json.error || res.statusText)
      return { ok: false, error: json.error || res.statusText }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('Notifikasi email error:', err)
    return { ok: false, error: err?.message }
  }
}

// ---------- seed ----------
function seed(): DB {
  const today = new Date()
  const at = (h: number, m: number, daysAgo = 0) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const day = (daysAgo = 0) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    return ymd(d)
  }
  const dur = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 60000)
  const base = { spvName: '', coupon: 'NONE' as CouponStatus }
  const done = (id: string, daysAgo: number, user: string, name: string, dept: string, guest: string, dest: string, purpose: string, driverId: string, plate: string, go: [number, number], back: [number, number], distKm = 25, estMins = 45, coupon?: CouponStatus): Trip => {
    const g = at(go[0], go[1], daysAgo)
    const b = at(back[0], back[1], daysAgo)
    return {
      ...base, id, date: day(daysAgo), requesterUser: user, requesterName: name, dept, category: 'Dinas', guest, destination: dest, purpose,
      estDeparture: `${String(go[0]).padStart(2, '0')}:${String(go[1]).padStart(2, '0')}`, status: 'DONE', spvName: `SPV ${dept}`, spvAt: g,
      driverId, plate, timeGo: g, timeBack: b, securityGo: 'security', securityBack: 'security', durationMin: dur(g, b),
      distance_km: distKm, estimated_duration_minutes: estMins,
      coupon: coupon ?? couponFromBack(b),
    }
  }
  return {
    drivers: [
      { id: 'DRV-001', name: 'TAUFIK', onLeave: false, phone: '0858-6163-0614', defaultPlate: 'W 1318 TI', simType: 'SIM A' },
      { id: 'DRV-002', name: 'GHOFUR', onLeave: false, phone: '0853-3151-1277', defaultPlate: 'W 1156 QY', simType: 'SIM A' },
      { id: 'DRV-003', name: 'HENDRO', onLeave: false, phone: '0899-8129-314', defaultPlate: 'W 1460 NE', simType: 'SIM A' },
      { id: 'DRV-004', name: 'THAMRIN', onLeave: false, phone: '0822-2817-6185', defaultPlate: 'L 1005 DBU', simType: 'SIM A' },
      { id: 'DRV-005', name: 'SAHARI', onLeave: false, phone: '0895-3374-11921', defaultPlate: 'W 1458 NE', simType: 'SIM A' },
      { id: 'DRV-006', name: 'ICHSAN', onLeave: false, phone: '0822-3285-8300', defaultPlate: 'L 1508 DBR', simType: 'SIM A' },
      { id: 'DRV-007', name: 'KARYADI', onLeave: false, phone: '0895-3962-74446', defaultPlate: 'L 1910 DAS', simType: 'SIM A' },
      { id: 'DRV-008', name: 'INDRA', onLeave: false, phone: '0821-3175-7218', defaultPlate: 'W 1459 NE', simType: 'SIM A' },
    ],
    vehicles: [
      // Kategori Mobil Expat (Dedicated User: Fujiyoshi, Isoda, Kato, Tateishi)
      { plate: 'W 1318 TI', type: 'INNOVA ZENIX HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'FUJIYOSHI', fuelEfficiency: 15, fuelType: 'Bensin' },
      { plate: 'W 1156 QY', type: 'INNOVA REBORN SILVER', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'ISODA', fuelEfficiency: 11, fuelType: 'Bensin' },
      { plate: 'W 1460 NE', type: 'INNOVA REBORN HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'KATO', fuelEfficiency: 11, fuelType: 'Bensin' },
      { plate: 'L 1005 DBU', type: 'INNOVA ZENIX HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'TATEISHI', fuelEfficiency: 15, fuelType: 'Bensin' },
      // Kategori Mobil Operasional (User: Operational)
      { plate: 'W 1458 NE', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL', fuelEfficiency: 11, fuelType: 'Bensin' },
      { plate: 'L 1508 DBR', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL', fuelEfficiency: 11, fuelType: 'Bensin' },
      { plate: 'L 1910 DAS', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL', fuelEfficiency: 11, fuelType: 'Bensin' },
      { plate: 'W 1459 NE', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL', fuelEfficiency: 11, fuelType: 'Bensin' },
    ],
    trips: [],
  }
}

// ---------- context ----------
type NewTrip = Pick<Trip, 'category' | 'guest' | 'destination' | 'purpose' | 'estDeparture' | 'estReturn' | 'requesterUser' | 'requesterName' | 'dept'> & {
  date?: string
  requesterNik?: string
  section?: string
  golongan?: number
  approverRole?: 'SSPV' | 'Manager'
  spvName?: string
  spvEmail?: string
  approverEmail?: string
  passengers?: Passenger[]
  origin?: string
  destinations?: string[]
  returnToOrigin?: boolean
  delayReason?: string
  driverOnly?: boolean
  isOtherVehicle?: boolean
  otherVehicleName?: string
  blockedDefaultPlate?: string
  blockedReason?: string
  distance_km?: number
  estimated_duration_minutes?: number
  isLeaveReplacement?: boolean
  replacementDriverName?: string
}

type DirectBookingParams = {
  plate: string
  driverId?: string
  date: string
  requesterUser?: string
  estDeparture: string
  estReturn?: string
  origin?: string
  destination: string
  destinations?: string[]
  returnToOrigin?: boolean
  purpose: string
  guest: string
  dept: string
  section?: string
  golongan?: number
  approverRole?: 'SSPV' | 'Manager'
  adminNote: string
  category?: Category
  requesterName?: string
  requesterNik?: string
  approvedBy?: string
  approverEmail?: string
  passengers?: Passenger[]
  driverOnly?: boolean
  isOtherVehicle?: boolean
  otherVehicleName?: string
  distance_km?: number
  estimated_duration_minutes?: number
  isLeaveReplacement?: boolean
  replacementDriverName?: string
}

export type TripSubmitResult = {
  id: string
  success: boolean
  error?: string
  emailError?: string
}

type Ctx = {
  ready: boolean
  db: DB
  createTrip: (t: NewTrip) => Promise<TripSubmitResult>
  directBooking: (params: DirectBookingParams) => Promise<TripSubmitResult>
  spvDecision: (id: string, approve: boolean, note?: string) => void
  poolSpvDecision: (id: string, approve: boolean, note?: string, approverName?: string) => void
  assignTrip: (id: string, driverId: string, plate: string) => void
  scheduleTrip: (id: string, params: { plate: string; driverId?: string; date: string; estDeparture: string; estReturn?: string; adminNote?: string; isOtherVehicle?: boolean; otherVehicleName?: string; origin?: string; destination?: string; returnToOrigin?: boolean; isLeaveReplacement?: boolean; replacementDriverName?: string }) => void
  editTrip: (id: string, t: Partial<NewTrip>) => Promise<TripSubmitResult>
  deleteTrip: (id: string) => Promise<{ success: boolean; error?: string }>
  rescheduleTrip: (id: string, params: { plate: string; driverId?: string; date: string; estDeparture: string; estReturn?: string; adminNote?: string; isOtherVehicle?: boolean; otherVehicleName?: string }) => Promise<{ success: boolean; error?: string }>
  cancelTrip: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  rejectTrip: (id: string, reason: string) => void
  gateGo: (id: string, security: string) => void
  gateBack: (id: string, security: string, delayReason?: string) => void
  startDriverTrip: (id: string) => void
  endDriverTrip: (id: string, delayReason?: string) => void
  submitDelayReason: (id: string, delayReason: string) => void
  clockInDriver: (driverId: string) => void
  clockOutDriver: (driverId: string) => void
  claimCoupon: (id: string) => void
  setCouponProgress: (id: string) => void
  payCoupon: (id: string, adminName: string, prNumber?: string) => void
  addDriver: (d: Omit<Driver, 'id' | 'onLeave'>) => void
  updateDriver: (id: string, d: Partial<Driver>) => void
  removeDriver: (id: string) => void
  toggleLeave: (driverId: string, replacementName?: string) => void
  addVehicle: (v: Vehicle) => Promise<{ success: boolean; error?: string }>
  updateVehicle: (plate: string, v: Partial<Vehicle>) => Promise<{ success: boolean; error?: string }>
  removeVehicle: (plate: string) => Promise<{ success: boolean; error?: string }>
  // Overtime
  createOvertime: (ot: Omit<OvertimeRequest, 'id' | 'status' | 'createdAt'>) => void
  approveOvertime: (id: string, approverName: string) => void
  rejectOvertime: (id: string) => void
  endOvertime: (id: string, actualEnd?: string) => void
  submitOvertimeReport: (id: string, report: string) => void
  approveOvertimeReport: (id: string) => void
  resetDemo: () => void
}

const StoreCtx = createContext<Ctx | null>(null)
const KEY = 'ff_db_v2'

function sanitizeDB(rawDb: any): DB {
  const seeded = seed()
  if (!rawDb || typeof rawDb !== 'object') return seeded
  const drivers = Array.isArray(rawDb.drivers) && rawDb.drivers.length > 0 ? rawDb.drivers : seeded.drivers
  const vehicles = (Array.isArray(rawDb.vehicles) && rawDb.vehicles.length > 0 ? rawDb.vehicles : seeded.vehicles).map((v: any) => ({
    ...v,
    status: v.status || 'Active',
    fuelEfficiency: typeof v.fuelEfficiency === 'number' && v.fuelEfficiency > 0 ? v.fuelEfficiency : getDefaultFuelEfficiency(v.type),
    fuelType: v.fuelType || (v.type?.toUpperCase().includes('DIESEL') ? 'Diesel' : v.type?.toUpperCase().includes('HYBRID') ? 'Hybrid' : 'Bensin'),
  }))
  const trips = (Array.isArray(rawDb.trips) ? rawDb.trips : []).map((t: any) => ({
    ...t,
    destinations: normalizeDestinations(t.destinations, t.destination),
  }))
  return {
    drivers,
    vehicles,
    trips,
    attendances: Array.isArray(rawDb.attendances) ? rawDb.attendances : [],
    overtimeRequests: Array.isArray(rawDb.overtimeRequests) ? rawDb.overtimeRequests : [],
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>({ drivers: [], vehicles: [], trips: [] })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let initial: DB
    try {
      const raw = window.localStorage.getItem(KEY)
      initial = sanitizeDB(raw ? JSON.parse(raw) : null)
      if (!raw) window.localStorage.setItem(KEY, JSON.stringify(initial))
    } catch {
      initial = seed()
    }
    setDb(initial)
    setReady(true)

    // Sync data langsung dari Supabase saat online
    const loadFromRemote = async () => {
      try {
        const { fetchTripsFromSupabase, fetchVehiclesFromSupabase, fetchDriversFromSupabase } = await import('./sync')
        const [remoteTrips, remoteVehicles, remoteDrivers] = await Promise.all([
          fetchTripsFromSupabase(),
          fetchVehiclesFromSupabase(),
          fetchDriversFromSupabase(),
        ])

        setDb((prev) => {
          let currentLocal: DB = prev
          try {
            const raw = window.localStorage.getItem(KEY)
            if (raw) currentLocal = JSON.parse(raw)
          } catch {}

          const mergedRaw = {
            ...prev,
            ...currentLocal,
            trips: remoteTrips != null ? remoteTrips : (currentLocal.trips || prev.trips),
            vehicles: remoteVehicles != null ? remoteVehicles : (currentLocal.vehicles || prev.vehicles),
            drivers: remoteDrivers != null ? remoteDrivers : (currentLocal.drivers || prev.drivers),
            attendances: currentLocal.attendances || prev.attendances || [],
            overtimeRequests: currentLocal.overtimeRequests || prev.overtimeRequests || [],
          }
          const next = sanitizeDB(mergedRaw)
          window.localStorage.setItem(KEY, JSON.stringify(next))
          return next
        })
      } catch (err) {
        console.warn('Realtime fetch sync err:', err)
      }
    }

    // Panggil segera saat mount
    loadFromRemote()

    // Realtime Supabase Channel: mendengarkan INSERT, UPDATE, DELETE di tabel trips, vehicles, drivers
    const channelName = `db-live-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        loadFromRemote()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        loadFromRemote()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        loadFromRemote()
      })
      .subscribe()

    // BroadcastChannel untuk sinkronisasi seketika antar-tab/window di browser yang sama
    let broadcastChannel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('ff_store_sync_channel')
        broadcastChannel.onmessage = (event) => {
          if (event.data === 'sync' || event.data?.type === 'sync') {
            loadFromRemote()
          }
        }
      } catch {
        // Fallback jika tidak didukung
      }
    }

    // Polling backup cepat (setiap 3.5 detik) agar jika websocket sleep di server/device, data langsung update
    const intervalId = setInterval(loadFromRemote, 3500)

    // Trigger sinkronisasi seketika saat user kembali fokus ke tab atau jendela browser
    const onWindowFocus = () => {
      loadFromRemote()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadFromRemote()
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          setDb(sanitizeDB(JSON.parse(e.newValue)))
        } catch {}
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(intervalId)
      if (broadcastChannel) {
        broadcastChannel.close()
      }
      supabase.removeChannel(channel)
    }
  }, [])

  const update = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => {
      const next = fn(prev)
      window.localStorage.setItem(KEY, JSON.stringify(next))
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('ff_store_sync_channel')
          bc.postMessage({ type: 'sync' })
          bc.close()
        } catch {}
      }
      return next
    })
  }, [])
  const patch = useCallback((id: string, p: Partial<Trip> | ((t: Trip) => Partial<Trip>)) =>
    update((d) => {
      let updatedTrip: Trip | null = null
      let prevStatus: string | null = null
      const nextTrips = d.trips.map((t) => {
        if (t.id === id) {
          const next = { ...t, ...(typeof p === 'function' ? p(t) : p) }
          updatedTrip = next
          prevStatus = t.status
          return next
        }
        return t
      })
      if (updatedTrip) {
        const trip: Trip = updatedTrip
        const statusChanged = prevStatus !== trip.status
        import('./sync').then(async ({ upsertTripToSupabase }) => {
          const res = await upsertTripToSupabase(trip)
          if (!res.success) console.error('Sync trip gagal:', res.error)
          else if (statusChanged) notifyApprover(trip.id)
        })
      }
      return { ...d, trips: nextTrips }
    }), [update])

  const value = useMemo<Ctx>(() => ({
    ready, db,
    createTrip: async (t) => {
      const id = `T-${Date.now().toString().slice(-6)}`
      const reqUser = (!t.requesterUser || t.requesterUser === 'admin') ? 'admin1' : t.requesterUser
      const newTrip: Trip = {
        ...t,
        id,
        date: t.date || ymd(),
        requesterUser: reqUser,
        origin: t.origin || 'PT. JAI',
        returnToOrigin: t.returnToOrigin !== false,
        status: 'WAITING_SPV',
        spvName: t.spvName || `SPV ${t.dept}`,
        coupon: t.driverOnly ? 'VOID' : 'NONE',
      }
      
      const { upsertTripToSupabase } = await import('./sync')
      const syncRes = await upsertTripToSupabase(newTrip)

      if (syncRes.success) {
        update((d) => ({
          ...d,
          trips: [...d.trips, newTrip],
        }))
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('ff_store_sync_channel')
            bc.postMessage({ type: 'sync' })
            bc.close()
          } catch {}
        }
        const mail = await notifyApprover(id)
        return { id, success: true, emailError: mail.ok ? undefined : mail.error }
      } else {
        return { id, success: false, error: syncRes.error }
      }
    },
    // Direct Booking oleh Admin Utama via drag-to-book di kalender
    directBooking: async (params) => {
      const id = `T-${Date.now().toString().slice(-6)}`
      // Cek apakah driver membawa mobil lain, jika ya blokir defaultPlate driver
      const assignedDriver = params.driverId ? db.drivers.find((d) => d.id === params.driverId) : null
      const isUsingOtherCar = !!params.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== params.plate)
      const blockedDefault = isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : undefined
      const blockedText = blockedDefault ? `Driver sedang bertugas di ${params.plate || params.otherVehicleName || 'Mobil Luar'}` : undefined

      const reqUser = params.requesterUser && params.requesterUser !== 'admin' ? params.requesterUser : 'admin1'

      // Cari email approver dari master accounts jika tidak disediakan
      let approverEmail = params.approverEmail
      if (!approverEmail && params.approvedBy) {
        const cleanName = params.approvedBy.replace(/\(.*\)/, '').trim().toUpperCase()
        const { getAllAccounts, getManagerBySection } = await import('./accounts')
        const matched = getAllAccounts().find((a) => a.name.toUpperCase().includes(cleanName) || cleanName.includes(a.name.toUpperCase()))
        approverEmail = matched?.email || getManagerBySection(params.dept || 'PGA', params.section).email
      }

      const newTrip: Trip = {
        id,
        date: params.date,
        requesterUser: reqUser,
        requesterName: params.requesterName || 'Admin Utama (Pool GA)',
        requesterNik: params.requesterNik,
        dept: params.dept || 'PGA',
        section: params.section,
        approverEmail: approverEmail,
        spvEmail: approverEmail,
        category: params.category || 'Dinas',
        guest: params.driverOnly ? `Hanya Driver (Operasional Logistik)` : params.guest,
        origin: params.origin || 'PT. JAI',
        destination: params.destination,
        destinations: params.destinations,
        returnToOrigin: params.returnToOrigin !== false,
        purpose: params.purpose,
        estDeparture: params.estDeparture,
        estReturn: params.estReturn,
        distance_km: params.distance_km,
        estimated_duration_minutes: params.estimated_duration_minutes,
        passengers: params.passengers,
        status: 'WAITING_SPV', // Wajib masuk ke Tahap 1 persetujuan SPV/Manager Departemen!
        spvName: params.approvedBy || ('SPV ' + (params.dept || 'PGA')),
        spvAt: undefined, // Belum disetujui, menunggu tindakan E-Sign approver!
        adminNote: params.adminNote,
        driverId: params.driverId,
        plate: params.plate,
        driverOnly: params.driverOnly,
        isOtherVehicle: params.isOtherVehicle,
        otherVehicleName: params.otherVehicleName,
        blockedDefaultPlate: blockedDefault,
        blockedReason: blockedText,
        coupon: params.driverOnly ? 'VOID' : 'NONE',
      }

      const { upsertTripToSupabase } = await import('./sync')
      const syncRes = await upsertTripToSupabase(newTrip)

      if (syncRes.success) {
        update((d) => ({
          ...d,
          trips: [...d.trips, newTrip],
        }))
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('ff_store_sync_channel')
            bc.postMessage({ type: 'sync' })
            bc.close()
          } catch {}
        }
        const mail = await notifyApprover(id)
        return { id, success: true, emailError: mail.ok ? undefined : mail.error }
      } else {
        return { id, success: false, error: syncRes.error }
      }
    },
    // Tahap 1: SPV Departemen ACC -> Jika sudah dialokasikan armada & driver (direct booking), lanjut ke WAITING_POOL_SPV. Jika belum, ke WAITING_ASSIGN
    spvDecision: (id, approve, note) =>
      patch(id, (t) => {
        const nextStatus = !approve
          ? 'REJECTED'
          : (t.plate && t.driverId ? 'WAITING_POOL_SPV' : 'WAITING_ASSIGN')
        return {
          status: nextStatus,
          spvAt: new Date().toISOString(),
          spvNote: note,
          rejectReason: approve ? undefined : (note || 'Ditolak oleh SPV Departemen'),
        }
      }),
    // Tahap 2: SPV Kendaraan (Pool GA) Final ACC -> Status READY (Jadwal masuk ke driver)
    poolSpvDecision: (id, approve, note, approverName) =>
      patch(id, {
        status: approve ? 'READY' : 'REJECTED',
        poolSpvName: approverName || 'SPV Kendaraan (Pool GA)',
        poolSpvAt: new Date().toISOString(),
        poolSpvNote: note,
        rejectReason: approve ? undefined : (note || 'Ditolak oleh SPV Kendaraan'),
      }),
    assignTrip: (id, driverId, plate) =>
      patch(id, (t) => {
        const assignedDriver = driverId ? db.drivers.find((d) => d.id === driverId) : null
        const isUsingOtherCar = !!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== plate
        const blockedDefault = isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : undefined
        const blockedText = blockedDefault ? `Driver sedang bertugas di ${plate}` : undefined
        return {
          status: 'READY',
          driverId,
          plate,
          blockedDefaultPlate: blockedDefault,
          blockedReason: blockedText,
        }
      }),
    // Setelah Admin Utama drag ke kalender, status berubah menjadi WAITING_POOL_SPV (Pending Approval SPV Kendaraan)
    scheduleTrip: (id, params) =>
      patch(id, (t) => {
        const assignedDriver = params.driverId ? db.drivers.find((d) => d.id === params.driverId) : null
        const isUsingOtherCar = !!params.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== params.plate)
        const blockedDefault = isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : undefined
        const blockedText = blockedDefault ? `Driver sedang bertugas di ${params.plate || params.otherVehicleName || 'Mobil Luar'}` : undefined

        return {
          status: 'WAITING_POOL_SPV',
          plate: params.plate,
          driverId: params.driverId,
          date: params.date,
          estDeparture: params.estDeparture,
          estReturn: params.estReturn,
          adminNote: params.adminNote,
          isOtherVehicle: params.isOtherVehicle,
          otherVehicleName: params.otherVehicleName,
          blockedDefaultPlate: blockedDefault,
          blockedReason: blockedText,
          origin: params.origin ?? t.origin,
          destination: params.destination ?? t.destination,
          returnToOrigin: params.returnToOrigin ?? t.returnToOrigin,
        }
      }),
    // Edit Pengajuan oleh User (Pre-Approval Phase: Hanya diizinkan jika status masih WAITING_SPV)
    editTrip: async (id, params) => {
      const current = db.trips.find((t) => t.id === id)
      if (!current) {
        return { id, success: false, error: 'Pengajuan tidak ditemukan.' }
      }
      if (current.status !== 'WAITING_SPV') {
        return {
          id,
          success: false,
          error: 'Pengajuan ini sudah diproses/disetujui oleh atasan (status >= APPROVED_1) dan tidak dapat diedit langsung oleh User.',
        }
      }

      const updatedTrip: Trip = {
        ...current,
        ...params,
        id,
        requesterUser: current.requesterUser, // preserve original requester
        status: 'WAITING_SPV', // tetap WAITING_SPV
        isEdited: true, // Beri tanda keterangan EDITED
        editedAt: new Date().toISOString(),
        coupon: params.driverOnly ? 'VOID' : (current.coupon || 'NONE'),
      }

      const { upsertTripToSupabase } = await import('./sync')
      const syncRes = await upsertTripToSupabase(updatedTrip)

      if (syncRes.success) {
        update((d) => ({
          ...d,
          trips: d.trips.map((t) => (t.id === id ? updatedTrip : t)),
        }))

        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('ff_store_sync_channel')
            bc.postMessage({ type: 'sync' })
            bc.close()
          } catch {}
        }

        // Trigger ulang notifikasi email ke Approver Tahap 1 dengan label [EDITED]
        const mail = await notifyApprover(id, { isEdit: true })
        return { id, success: true, emailError: mail.ok ? undefined : mail.error }
      } else {
        return { id, success: false, error: syncRes.error }
      }
    },
    // Delete Pengajuan oleh User (Pre-Approval Phase: Hanya diizinkan jika status masih WAITING_SPV)
    deleteTrip: async (id) => {
      const current = db.trips.find((t) => t.id === id)
      if (!current) {
        return { success: false, error: 'Pengajuan tidak ditemukan.' }
      }
      if (current.status !== 'WAITING_SPV') {
        return {
          success: false,
          error: 'Pengajuan ini sudah diproses/disetujui oleh atasan (status >= APPROVED_1) dan tidak dapat dihapus oleh User.',
        }
      }

      update((d) => ({
        ...d,
        trips: d.trips.filter((t) => t.id !== id),
      }))

      const { deleteTripFromSupabase } = await import('./sync')
      const syncRes = await deleteTripFromSupabase(id)
      if (!syncRes.success) {
        console.error('Failed to delete trip from Supabase:', syncRes.error)
        return { success: false, error: syncRes.error }
      }

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('ff_store_sync_channel')
          bc.postMessage({ type: 'sync' })
          bc.close()
        } catch {}
      }

      return { success: true }
    },
    // Reschedule Jadwal oleh Admin Lobby / GA: Mengubah waktu/plat/driver/catatan dan mengirim notifikasi [UPDATE JADWAL]
    rescheduleTrip: async (id, params) => {
      const assignedDriver = params.driverId ? db.drivers.find((d) => d.id === params.driverId) : null
      const isUsingOtherCar = !!params.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== params.plate)
      const blockedDefault = isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : undefined
      const blockedText = blockedDefault ? `Driver sedang bertugas di ${params.plate || params.otherVehicleName || 'Mobil Luar'}` : undefined

      let targetTrip: Trip | null = null
      update((d) => {
        const nextTrips = d.trips.map((t) => {
          if (t.id === id) {
            const next: Trip = {
              ...t,
              // Jika status sebelumnya sudah disetujui (READY/ON_TRIP) atau WAITING_POOL_SPV, tetap siap jalan atau sesuaikan operasional
              plate: params.plate,
              driverId: params.driverId,
              date: params.date,
              estDeparture: params.estDeparture,
              estReturn: params.estReturn,
              adminNote: params.adminNote ?? t.adminNote,
              isOtherVehicle: params.isOtherVehicle,
              otherVehicleName: params.otherVehicleName,
              blockedDefaultPlate: blockedDefault,
              blockedReason: blockedText,
            }
            targetTrip = next
            return next
          }
          return t
        })
        return { ...d, trips: nextTrips }
      })

      if (targetTrip) {
        const { upsertTripToSupabase } = await import('./sync')
        const syncRes = await upsertTripToSupabase(targetTrip)
        if (!syncRes.success) {
          console.error('Failed to sync rescheduled trip:', syncRes.error)
          return { success: false, error: syncRes.error }
        }

        // Kirim Automated Notification [UPDATE JADWAL] ke Requester, Driver, & CC Approver 1 & 2
        notifyApprover(id, { actionType: 'reschedule' })
      }
      return { success: true }
    },
    // Cancel (Hapus/Batal) Penjadwalan oleh Admin Lobby / GA: Menghapus trip dari sistem dan membersihkan data di Supabase
    cancelTrip: async (id, reason) => {
      // Hapus dari state lokal
      update((d) => ({
        ...d,
        trips: d.trips.filter((t) => t.id !== id),
      }))
      const { deleteTripFromSupabase } = await import('./sync')
      const syncRes = await deleteTripFromSupabase(id)
      if (!syncRes.success) {
        console.error('Failed to delete trip from Supabase:', syncRes.error)
        return { success: false, error: syncRes.error }
      }

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('ff_store_sync_channel')
          bc.postMessage({ type: 'sync' })
          bc.close()
        } catch {}
      }

      return { success: true }
    },
    rejectTrip: (id, reason) => patch(id, { status: 'REJECTED', rejectReason: reason }),
    gateGo: (id, security) => patch(id, { status: 'ON_TRIP', timeGo: new Date().toISOString(), securityGo: security }),
    gateBack: (id, security, delayReason) =>
      patch(id, (t) => {
        const back = new Date().toISOString()
        const finalCoupon = t.driverOnly ? 'VOID' : couponFromBack(back)
        return {
          status: 'DONE',
          timeBack: back,
          securityBack: security,
          durationMin: Math.max(0, Math.round((+new Date(back) - +new Date(t.timeGo!)) / 60000)),
          coupon: finalCoupon,
          delayReason: delayReason || t.delayReason,
        }
      }),
    startDriverTrip: (id) =>
      patch(id, {
        status: 'ON_TRIP',
        timeGo: new Date().toISOString(),
        securityGo: 'driver-app',
      }),
    endDriverTrip: (id, delayReason) =>
      patch(id, (t) => {
        const back = new Date().toISOString()
        const finalCoupon = t.driverOnly ? 'VOID' : couponFromBack(back)
        const durationMin = t.timeGo ? Math.max(0, Math.round((+new Date(back) - +new Date(t.timeGo)) / 60000)) : (t.estimated_duration_minutes || 60)
        return {
          status: 'DONE',
          timeBack: back,
          securityBack: 'driver-app',
          durationMin,
          coupon: finalCoupon,
          delayReason: delayReason || t.delayReason,
        }
      }),
    submitDelayReason: (id, delayReason) => patch(id, { delayReason }),
    clockInDriver: (driverId) => {
      const today = ymd()
      const now = new Date().toISOString()
      update((d) => {
        const currentList = d.attendances || []
        const existingIdx = currentList.findIndex((a) => a.driverId === driverId && a.date === today)
        let nextList: DriverAttendance[]
        if (existingIdx >= 0) {
          nextList = currentList.map((a, idx) =>
            idx === existingIdx ? { ...a, clockIn: a.clockIn || now, status: 'HADIR' as const } : a
          )
        } else {
          nextList = [
            ...currentList,
            {
              driverId,
              date: today,
              clockIn: now,
              status: 'HADIR' as const,
              overtimeMinutes: 0,
            },
          ]
        }
        return { ...d, attendances: nextList }
      })
    },
    clockOutDriver: (driverId) => {
      const today = ymd()
      const now = new Date()
      const nowIso = now.toISOString()
      update((d) => {
        const currentList = d.attendances || []
        const existingIdx = currentList.findIndex((a) => a.driverId === driverId && a.date === today)
        let nextList: DriverAttendance[]
        if (existingIdx >= 0) {
          nextList = currentList.map((a, idx) =>
            idx === existingIdx
              ? {
                  ...a,
                  clockOut: nowIso,
                  status: 'PULANG' as const,
                  overtimeMinutes: a.overtimeMinutes || 0,
                }
              : a
          )
        } else {
          nextList = [
            ...currentList,
            {
              driverId,
              date: today,
              clockIn: nowIso,
              clockOut: nowIso,
              status: 'PULANG' as const,
              overtimeMinutes: 0,
            },
          ]
        }
        return { ...d, attendances: nextList }
      })
    },
    claimCoupon: (id) => patch(id, { coupon: 'PR_PENDING', claimedAt: new Date().toISOString() }),
    setCouponProgress: (id) => patch(id, { coupon: 'PR_PROGRESS' }),
    payCoupon: (id, adminName, prNumber) =>
      patch(id, {
        coupon: 'PAID',
        paidAt: new Date().toISOString(),
        paidBy: adminName,
        prNumber: prNumber || `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        prCreatedAt: new Date().toISOString(),
        prCreatedBy: adminName,
      }),
    addDriver: (d) => {
      const id = `d-${Date.now().toString().slice(-5)}`
      const newDriver: Driver = { ...d, id, onLeave: false }
      update((prev) => ({ ...prev, drivers: [...prev.drivers, newDriver] }))
      import('./sync').then(({ upsertDriverToSupabase }) => upsertDriverToSupabase(newDriver))
    },
    updateDriver: (id, p) =>
      update((prev) => {
        let updated: Driver | null = null
        const next = prev.drivers.map((x) => {
          if (x.id === id) {
            const n = { ...x, ...p }
            updated = n
            return n
          }
          return x
        })
        if (updated) {
          import('./sync').then(({ upsertDriverToSupabase }) => upsertDriverToSupabase(updated!))
        }
        return { ...prev, drivers: next }
      }),
    removeDriver: (id) => {
      update((prev) => ({ ...prev, drivers: prev.drivers.filter((x) => x.id !== id) }))
      import('./sync').then(({ deleteDriverFromSupabase }) => deleteDriverFromSupabase(id))
    },
    toggleLeave: (driverId, replacementName) =>
      update((d) => {
        let updated: Driver | null = null
        const next = d.drivers.map((x) => {
          if (x.id === driverId) {
            const willLeave = !x.onLeave
            const n: Driver = {
              ...x,
              onLeave: willLeave,
              leaveReplacementName: willLeave ? (replacementName || undefined) : undefined,
            }
            updated = n
            return n
          }
          return x
        })
        if (updated) {
          import('./sync').then(({ upsertDriverToSupabase }) => upsertDriverToSupabase(updated!))
        }
        return { ...d, drivers: next }
      }),
    createOvertime: (ot) =>
      update((d) => {
        const id = `OT-${Date.now().toString().slice(-6)}`
        const newOt: OvertimeRequest = {
          ...ot,
          id,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        }
        return {
          ...d,
          overtimeRequests: [...(d.overtimeRequests || []), newOt],
        }
      }),
    approveOvertime: (id, approverName) =>
      update((d) => {
        const next = (d.overtimeRequests || []).map((ot) => {
          if (ot.id === id) {
            return {
              ...ot,
              status: 'APPROVED' as const,
              approvedBy: approverName,
              approvedAt: new Date().toISOString(),
            }
          }
          return ot
        })
        return { ...d, overtimeRequests: next }
      }),
    rejectOvertime: (id) =>
      update((d) => {
        const next = (d.overtimeRequests || []).map((ot) => {
          if (ot.id === id) {
            return { ...ot, status: 'REJECTED' as const }
          }
          return ot
        })
        return { ...d, overtimeRequests: next }
      }),
    endOvertime: (id, actualEnd) =>
      update((d) => {
        const nowIso = actualEnd || new Date().toISOString()
        const now = new Date(nowIso)
        const next = (d.overtimeRequests || []).map((ot) => {
          if (ot.id === id) {
            // Cek selisih waktu dengan plan endOT (HH:mm)
            const [endH, endM] = ot.endOT.split(':').map(Number)
            const planEnd = new Date(nowIso)
            planEnd.setHours(endH || 0, endM || 0, 0, 0)
            const diffMinutes = Math.abs(Math.round((now.getTime() - planEnd.getTime()) / 60000))
            const isSuspended = diffMinutes > 15

            return {
              ...ot,
              actualEnd: nowIso,
              isSuspended,
              status: isSuspended ? ('SUSPENDED' as const) : ('COMPLETED' as const),
            }
          }
          return ot
        })
        return { ...d, overtimeRequests: next }
      }),
    submitOvertimeReport: (id, report) =>
      update((d) => {
        const next = (d.overtimeRequests || []).map((ot) => {
          if (ot.id === id) {
            return {
              ...ot,
              driverReport: report,
              status: 'WAITING_REPORT' as const,
            }
          }
          return ot
        })
        return { ...d, overtimeRequests: next }
      }),
    approveOvertimeReport: (id) =>
      update((d) => {
        const next = (d.overtimeRequests || []).map((ot) => {
          if (ot.id === id) {
            return {
              ...ot,
              status: 'COMPLETED' as const,
              reportApprovedAt: new Date().toISOString(),
            }
          }
          return ot
        })
        return { ...d, overtimeRequests: next }
      }),
    addVehicle: async (v) => {
      const newVehicle: Vehicle = { ...v, status: v.status || 'Active' }
      const { upsertVehicleToSupabase } = await import('./sync')
      const res = await upsertVehicleToSupabase(newVehicle)
      if (res.success) {
        update((prev) => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }))
      }
      return res
    },
    updateVehicle: async (plate, p) => {
      const { upsertVehicleToSupabase, deleteVehicleFromSupabase, upsertTripToSupabase } = await import('./sync')
      const existing = db.vehicles.find((v) => v.plate === plate)
      const newPlate = p.plate ? p.plate.trim().toUpperCase() : plate
      const isPlateChanged = newPlate !== plate
      const updatedVehicle: Vehicle = {
        ...(existing || { plate, type: '', capacity: 7, status: 'Active' }),
        ...p,
        plate: newPlate,
      }

      // 1. Upsert updated vehicle with new plate (or existing plate)
      const res = await upsertVehicleToSupabase(updatedVehicle)
      if (!res.success) {
        return res
      }

      // 2. If plate number changed, cascade update trips and delete old plate in Supabase
      if (isPlateChanged) {
        await deleteVehicleFromSupabase(plate)
        // Also update any trips that referenced the old plate
        const affectedTrips = db.trips.filter((t) => t.plate === plate)
        for (const trip of affectedTrips) {
          const updatedTrip = { ...trip, plate: newPlate }
          await upsertTripToSupabase(updatedTrip)
        }
      }

      // 3. Update local state
      update((prev) => {
        const nextVehicles = prev.vehicles.map((v) => (v.plate === plate ? updatedVehicle : v))
        const nextTrips = isPlateChanged
          ? prev.trips.map((t) => (t.plate === plate ? { ...t, plate: newPlate } : t))
          : prev.trips
        return { ...prev, vehicles: nextVehicles, trips: nextTrips }
      })

      return { success: true }
    },
    removeVehicle: async (plate) => {
      const { deleteVehicleFromSupabase } = await import('./sync')
      const res = await deleteVehicleFromSupabase(plate)
      if (res.success) {
        update((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.plate !== plate) }))
      }
      return res
    },
    resetDemo: () => update(() => seed()),
  }), [ready, db, update, patch])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('StoreProvider missing')
  return c
}

// ---------- derived ----------
export function driverState(db: DB, driverId: string): 'Tersedia' | 'Sedang Bertugas' | 'Cuti' | 'Overtime' {
  const d = db.drivers.find((x) => x.id === driverId)
  if (d?.onLeave) return 'Cuti'

  // Cek apakah driver sedang dalam masa Overtime aktif (APPROVED / SUSPENDED)
  const activeOt = (db.overtimeRequests || []).find(
    (ot) => ot.driverId === driverId && (ot.status === 'APPROVED' || ot.status === 'ACTIVE' || ot.status === 'SUSPENDED')
  )
  if (activeOt) return 'Overtime'

  return db.trips.some((t) => t.driverId === driverId && (t.status === 'READY' || t.status === 'ON_TRIP')) ? 'Sedang Bertugas' : 'Tersedia'
}
export function vehicleState(db: DB, plate: string): 'Tersedia' | 'Sedang Bertugas' {
  return db.trips.some((t) => t.plate === plate && (t.status === 'READY' || t.status === 'ON_TRIP')) ? 'Sedang Bertugas' : 'Tersedia'
}

