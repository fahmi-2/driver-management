'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Category = 'Dinas' | 'Non-Dinas'
export type TripStatus = 'WAITING_SPV' | 'WAITING_ASSIGN' | 'WAITING_POOL_SPV' | 'READY' | 'ON_TRIP' | 'DONE' | 'REJECTED'
export type CouponStatus = 'NONE' | 'VOID' | 'CLAIMABLE' | 'PR_PENDING' | 'PR_PROGRESS' | 'PAID'

export type ShiftType = 'Pagi (07:00 - 15:00)' | 'Siang (15:00 - 23:00)' | 'Malam (23:00 - 07:00)' | 'General (08:00 - 17:00)'

export type Driver = {
  id: string
  name: string
  onLeave: boolean
  shift?: string
  phone?: string
  defaultPlate?: string
  simType?: string
}
export type VehicleCategory = 'Mobil Operasional' | 'Mobil Expat' | 'Mobil Sewa'
export type VehicleStatus = 'Active' | 'Maintenance'
export type Vehicle = {
  plate: string
  type: string
  status?: VehicleStatus
  category?: VehicleCategory
  capacity?: number
  dedicatedUser?: string
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
  approverEmail?: string // Email penerima notifikasi persetujuan (Manager/SSPV)
  category: Category
  guest: string
  destination: string
  destinations?: string[] // Multi-drop route destinations
  passengers?: Passenger[] // Multi-passenger list
  driverOnly?: boolean // Opsi hanya driver (antar/jemput dokumen/barang tanpa penumpang)
  isOtherVehicle?: boolean // Opsi "Mobil Lain" (driver bawa mobil di luar armada master)
  otherVehicleName?: string // Nama mobil manajer / mobil luar
  blockedDefaultPlate?: string // Plat mobil default driver yang terblokir
  blockedReason?: string // Keterangan blokir (misal: "Driver sedang [Catatan]")
  purpose: string
  estDeparture: string // HH:mm
  estReturn?: string // HH:mm
  distance_km?: number
  estimated_duration_minutes?: number
  status: TripStatus
  spvName: string // Approver SPV Departemen
  spvEmail?: string
  spvAt?: string
  spvNote?: string
  poolSpvName?: string // Approver Tahap 2: SPV Kendaraan / Pool GA
  poolSpvAt?: string
  poolSpvNote?: string
  adminNote?: string // Optional note from Admin Utama during approval/assignment
  rejectReason?: string // Mandatory reason when rejected by Admin / SPV
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

type DB = { drivers: Driver[]; vehicles: Vehicle[]; trips: Trip[] }

export const NOON_HOUR = 12

// ---------- helpers ----------
export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '—'
export const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDur = (min?: number) => (min == null ? '—' : `${Math.floor(min / 60)}j ${String(min % 60).padStart(2, '0')}m`)
export const couponFromBack = (iso: string): CouponStatus => (new Date(iso).getHours() >= NOON_HOUR ? 'CLAIMABLE' : 'VOID')

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
export async function notifyApprover(tripId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
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
      { plate: 'W 1318 TI', type: 'INNOVA ZENIX HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'FUJIYOSHI' },
      { plate: 'W 1156 QY', type: 'INNOVA REBORN SILVER', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'ISODA' },
      { plate: 'W 1460 NE', type: 'INNOVA REBORN HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'KATO' },
      { plate: 'L 1005 DBU', type: 'INNOVA ZENIX HITAM', status: 'Active', category: 'Mobil Expat', capacity: 7, dedicatedUser: 'TATEISHI' },
      // Kategori Mobil Operasional (User: Operational)
      { plate: 'W 1458 NE', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL' },
      { plate: 'L 1508 DBR', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL' },
      { plate: 'L 1910 DAS', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL' },
      { plate: 'W 1459 NE', type: 'AVANZA PUTIH', status: 'Active', category: 'Mobil Operasional', capacity: 7, dedicatedUser: 'OPERATIONAL' },
    ],
    trips: [],
  }
}

// ---------- context ----------
type NewTrip = Pick<Trip, 'category' | 'guest' | 'destination' | 'purpose' | 'estDeparture' | 'estReturn' | 'requesterUser' | 'requesterName' | 'dept'> & {
  requesterNik?: string
  section?: string
  spvName?: string
  spvEmail?: string
  approverEmail?: string
  passengers?: Passenger[]
  destinations?: string[]
  driverOnly?: boolean
  isOtherVehicle?: boolean
  otherVehicleName?: string
  blockedDefaultPlate?: string
  blockedReason?: string
  distance_km?: number
  estimated_duration_minutes?: number
}

type DirectBookingParams = {
  plate: string
  driverId?: string
  date: string
  estDeparture: string
  estReturn?: string
  destination: string
  destinations?: string[]
  purpose: string
  guest: string
  dept: string
  section?: string
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
  scheduleTrip: (id: string, params: { plate: string; driverId?: string; date: string; estDeparture: string; estReturn?: string; adminNote?: string; isOtherVehicle?: boolean; otherVehicleName?: string }) => void
  rejectTrip: (id: string, reason: string) => void
  gateGo: (id: string, security: string) => void
  gateBack: (id: string, security: string) => void
  claimCoupon: (id: string) => void
  setCouponProgress: (id: string) => void
  payCoupon: (id: string, adminName: string, prNumber?: string) => void
  addDriver: (d: Omit<Driver, 'id' | 'onLeave'>) => void
  updateDriver: (id: string, d: Partial<Driver>) => void
  removeDriver: (id: string) => void
  toggleLeave: (driverId: string) => void
  addVehicle: (v: Vehicle) => void
  updateVehicle: (plate: string, v: Partial<Vehicle>) => void
  removeVehicle: (plate: string) => void
  resetDemo: () => void
}

const StoreCtx = createContext<Ctx | null>(null)
const KEY = 'ff_db_v2'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>({ drivers: [], vehicles: [], trips: [] })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY)
    let initial: DB = raw ? (JSON.parse(raw) as DB) : seed()
    if (initial.vehicles && initial.vehicles.some((v) => !v.status)) {
      initial = {
        ...initial,
        vehicles: initial.vehicles.map((v) => ({ ...v, status: v.status || 'Active' })),
      }
    }
    if (!raw) window.localStorage.setItem(KEY, JSON.stringify(initial))
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
          const next: DB = {
            trips: remoteTrips != null ? remoteTrips : prev.trips,
            vehicles: remoteVehicles && remoteVehicles.length > 0 ? remoteVehicles : prev.vehicles,
            drivers: remoteDrivers && remoteDrivers.length > 0 ? remoteDrivers : prev.drivers,
          }
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
    let subscriptionChannel: any = null
    import('./supabase').then(({ supabase }) => {
      subscriptionChannel = supabase
        .channel('db-live-sync-realtime')
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
    })

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
        setDb(JSON.parse(e.newValue))
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
      if (subscriptionChannel) {
        import('./supabase').then(({ supabase }) => {
          supabase.removeChannel(subscriptionChannel)
        })
      }
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
      const newTrip: Trip = {
        ...t,
        id,
        date: ymd(),
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
      const blockedText = blockedDefault ? `Driver sedang ${params.adminNote || params.purpose}` : undefined

      const newTrip: Trip = {
        id,
        date: params.date,
        requesterUser: 'admin',
        requesterName: params.requesterName || 'Admin Utama (Pool GA)',
        requesterNik: params.requesterNik,
        dept: params.dept || 'PGA',
        section: params.section,
        approverEmail: params.approverEmail,
        spvEmail: params.approverEmail,
        category: params.category || 'Dinas',
        guest: params.driverOnly ? `Hanya Driver (Operasional Logistik)` : params.guest,
        destination: params.destination,
        destinations: params.destinations,
        purpose: params.purpose,
        estDeparture: params.estDeparture,
        estReturn: params.estReturn,
        distance_km: params.distance_km,
        estimated_duration_minutes: params.estimated_duration_minutes,
        passengers: params.passengers,
        status: 'WAITING_POOL_SPV', // Masuk tahap 2 approval SPV Kendaraan
        spvName: params.approvedBy || 'Admin Utama (Direct Booking)',
        spvAt: new Date().toISOString(),
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
    // Tahap 1: SPV Departemen ACC -> Masuk ke antrean Admin (WAITING_ASSIGN)
    spvDecision: (id, approve, note) =>
      patch(id, {
        status: approve ? 'WAITING_ASSIGN' : 'REJECTED',
        spvAt: new Date().toISOString(),
        spvNote: note,
        rejectReason: approve ? undefined : (note || 'Ditolak oleh SPV Departemen'),
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
    assignTrip: (id, driverId, plate) => patch(id, { status: 'READY', driverId, plate }),
    // Setelah Admin Utama drag ke kalender, status berubah menjadi WAITING_POOL_SPV (Pending Approval SPV Kendaraan)
    scheduleTrip: (id, params) =>
      patch(id, (t) => {
        const assignedDriver = params.driverId ? db.drivers.find((d) => d.id === params.driverId) : null
        const isUsingOtherCar = !!params.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== params.plate)
        const blockedDefault = isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : undefined
        const blockedText = blockedDefault ? `Driver sedang ${params.adminNote || t.purpose}` : undefined

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
        }
      }),
    rejectTrip: (id, reason) => patch(id, { status: 'REJECTED', rejectReason: reason }),
    gateGo: (id, security) => patch(id, { status: 'ON_TRIP', timeGo: new Date().toISOString(), securityGo: security }),
    gateBack: (id, security) =>
      patch(id, (t) => {
        const back = new Date().toISOString()
        // Jika opsi driverOnly aktif, hak kupon otomatis hangus / VOID
        const finalCoupon = t.driverOnly ? 'VOID' : couponFromBack(back)
        return {
          status: 'DONE',
          timeBack: back,
          securityBack: security,
          durationMin: Math.max(0, Math.round((+new Date(back) - +new Date(t.timeGo!)) / 60000)),
          coupon: finalCoupon,
        }
      }),
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
    toggleLeave: (driverId) =>
      update((d) => {
        let updated: Driver | null = null
        const next = d.drivers.map((x) => {
          if (x.id === driverId) {
            const n = { ...x, onLeave: !x.onLeave }
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
    addVehicle: (v) => {
      const newVehicle: Vehicle = { ...v, status: v.status || 'Active' }
      update((prev) => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }))
      import('./sync').then(({ upsertVehicleToSupabase }) => upsertVehicleToSupabase(newVehicle))
    },
    updateVehicle: (plate, p) =>
      update((prev) => {
        let updated: Vehicle | null = null
        const next = prev.vehicles.map((v) => {
          if (v.plate === plate) {
            const n = { ...v, ...p }
            updated = n
            return n
          }
          return v
        })
        if (updated) {
          import('./sync').then(({ upsertVehicleToSupabase }) => upsertVehicleToSupabase(updated!))
        }
        return { ...prev, vehicles: next }
      }),
    removeVehicle: (plate) => {
      update((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.plate !== plate) }))
      import('./sync').then(({ deleteVehicleFromSupabase }) => deleteVehicleFromSupabase(plate))
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
export function driverState(db: DB, driverId: string): 'Tersedia' | 'Sedang Bertugas' | 'Cuti' {
  const d = db.drivers.find((x) => x.id === driverId)
  if (d?.onLeave) return 'Cuti'
  return db.trips.some((t) => t.driverId === driverId && (t.status === 'READY' || t.status === 'ON_TRIP')) ? 'Sedang Bertugas' : 'Tersedia'
}
export function vehicleState(db: DB, plate: string): 'Tersedia' | 'Sedang Bertugas' {
  return db.trips.some((t) => t.plate === plate && (t.status === 'READY' || t.status === 'ON_TRIP')) ? 'Sedang Bertugas' : 'Tersedia'
}
