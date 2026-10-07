'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Category = 'Dinas' | 'Non-Dinas' | 'Izin Keluar Lokasi Pabrik'
export type TripStatus = 'WAITING_SPV' | 'WAITING_ASSIGN' | 'READY' | 'ON_TRIP' | 'DONE' | 'REJECTED'
export type CouponStatus = 'NONE' | 'VOID' | 'CLAIMABLE' | 'CLAIMED' | 'PAID'

export type ShiftType = 'Pagi (07:00 - 15:00)' | 'Siang (15:00 - 23:00)' | 'Malam (23:00 - 07:00)' | 'General (08:00 - 17:00)'

export type Driver = {
  id: string
  name: string
  onLeave: boolean
  shift?: ShiftType
  phone?: string
  defaultPlate?: string
  simType?: string
}
export type VehicleStatus = 'Active' | 'Maintenance'
export type Vehicle = { plate: string; type: string; status?: VehicleStatus }

export type Trip = {
  id: string
  date: string // YYYY-MM-DD
  requesterUser: string
  requesterName: string
  dept: string
  category: Category
  guest: string
  destination: string
  purpose: string
  estDeparture: string // HH:mm
  estReturn?: string // HH:mm
  status: TripStatus
  spvName: string
  spvAt?: string
  spvNote?: string
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
  WAITING_SPV: 'Menunggu SPV',
  WAITING_ASSIGN: 'Menunggu Assign',
  READY: 'Siap Berangkat',
  ON_TRIP: 'Sedang Bertugas',
  DONE: 'Selesai',
  REJECTED: 'Ditolak',
}
export const COUPON_LABEL: Record<CouponStatus, string> = {
  NONE: '—',
  VOID: 'VOID',
  CLAIMABLE: 'CLAIMABLE',
  CLAIMED: 'Diajukan',
  PAID: 'Cair',
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
  const done = (id: string, daysAgo: number, user: string, name: string, dept: string, guest: string, dest: string, purpose: string, driverId: string, plate: string, go: [number, number], back: [number, number], coupon?: CouponStatus): Trip => {
    const g = at(go[0], go[1], daysAgo)
    const b = at(back[0], back[1], daysAgo)
    return {
      ...base, id, date: day(daysAgo), requesterUser: user, requesterName: name, dept, category: 'Dinas', guest, destination: dest, purpose,
      estDeparture: `${String(go[0]).padStart(2, '0')}:${String(go[1]).padStart(2, '0')}`, status: 'DONE', spvName: `SPV ${dept}`, spvAt: g,
      driverId, plate, timeGo: g, timeBack: b, securityGo: 'security', securityBack: 'security', durationMin: dur(g, b), coupon: coupon ?? couponFromBack(b),
    }
  }
  return {
    drivers: [
      { id: 'd1', name: 'Budi Santoso', onLeave: false, shift: 'Pagi (07:00 - 15:00)', phone: '0812-3456-7890', defaultPlate: 'B 1824 KQA', simType: 'SIM B1 Umum' },
      { id: 'd2', name: 'Agus Pranoto', onLeave: false, shift: 'Pagi (07:00 - 15:00)', phone: '0813-9876-5432', defaultPlate: 'B 2901 TSI', simType: 'SIM A' },
      { id: 'd3', name: 'Hendra Wijaya', onLeave: false, shift: 'Siang (15:00 - 23:00)', phone: '0857-1122-3344', defaultPlate: 'B 1742 ULM', simType: 'SIM B1' },
      { id: 'd4', name: 'Dedi Kurniawan', onLeave: true, shift: 'General (08:00 - 17:00)', phone: '0878-5566-7788', defaultPlate: 'B 2188 PRT', simType: 'SIM B1 Umum' },
    ],
    vehicles: [
      { plate: 'B 1824 KQA', type: 'Toyota Innova', status: 'Active' },
      { plate: 'B 2901 TSI', type: 'Toyota Avanza', status: 'Active' },
      { plate: 'B 1742 ULM', type: 'Mitsubishi Xpander', status: 'Active' },
      { plate: 'B 2188 PRT', type: 'Toyota HiAce', status: 'Active' },
    ],
    trips: ([
      done('T-1001', 0, 'requester1', 'Rina Kartika', 'Procurement', 'Rina Kartika', 'Kawasan Industri MM2100, Cikarang', 'Meeting vendor', 'd1', 'B 1824 KQA', [7, 40], [12, 35]),
      done('T-1002', 0, 'requester2', 'Taufik Hidayat', 'Engineering', 'Taufik Hidayat', 'Cikarang Dry Port', 'Pengecekan kargo', 'd2', 'B 2901 TSI', [8, 15], [11, 20]),
      {
        ...base, id: 'T-1003', date: day(0), requesterUser: 'requester1', requesterName: 'Rina Kartika', dept: 'Procurement', category: 'Dinas', guest: 'Mr. Tanaka (Vendor)',
        destination: 'Bandara Soekarno-Hatta', purpose: 'Jemput tamu vendor', estDeparture: '08:45', status: 'ON_TRIP', spvName: 'SPV Procurement', spvAt: at(8, 0),
        driverId: 'd3', plate: 'B 1742 ULM', timeGo: at(8, 50), securityGo: 'security',
      },
      {
        ...base, id: 'T-1004', date: day(0), requesterUser: 'requester2', requesterName: 'Taufik Hidayat', dept: 'Engineering', category: 'Non-Dinas', guest: 'Taufik Hidayat',
        destination: 'Summarecon Bekasi', purpose: 'Keperluan pribadi (disetujui)', estDeparture: '14:00', status: 'READY', spvName: 'SPV Engineering', spvAt: at(9, 0),
        driverId: 'd2', plate: 'B 2901 TSI',
      },
      {
        ...base, id: 'T-1005', date: day(0), requesterUser: 'requester1', requesterName: 'Rina Kartika', dept: 'Procurement', category: 'Izin Keluar Lokasi Pabrik', guest: 'Nadia Putri',
        destination: 'Bekasi Barat', purpose: 'Urusan bank', estDeparture: '15:00', status: 'WAITING_ASSIGN', spvName: 'SPV Procurement', spvAt: at(9, 30),
      },
      {
        ...base, id: 'T-1006', date: day(0), requesterUser: 'requester2', requesterName: 'Taufik Hidayat', dept: 'Engineering', category: 'Dinas', guest: 'Yoga Prasetyo',
        destination: 'Kantor Pusat Jakarta', purpose: 'Presentasi proyek', estDeparture: '16:00', status: 'WAITING_SPV', spvName: 'SPV Engineering',
      },
      done('T-0901', 1, 'requester2', 'Taufik Hidayat', 'Engineering', 'Taufik Hidayat', 'Karawang Barat', 'Audit supplier', 'd1', 'B 1824 KQA', [8, 0], [13, 5], 'CLAIMED'),
      done('T-0902', 2, 'requester1', 'Rina Kartika', 'Procurement', 'Rina Kartika', 'Tanjung Priok', 'Customs clearance', 'd2', 'B 2901 TSI', [8, 30], [14, 10], 'PAID'),
      done('T-0903', 2, 'requester2', 'Taufik Hidayat', 'Engineering', 'Taufik Hidayat', 'Cibitung', 'Survey lokasi', 'd3', 'B 1742 ULM', [7, 45], [11, 0]),
    ] as Trip[]).map((t) => (t.id === 'T-0902' ? { ...t, claimedAt: at(15, 0, 2), paidAt: at(16, 0, 2), paidBy: 'Siska Wulandari' } : t)),
  }
}

// ---------- context ----------
type NewTrip = Pick<Trip, 'category' | 'guest' | 'destination' | 'purpose' | 'estDeparture' | 'requesterUser' | 'requesterName' | 'dept'>

type Ctx = {
  ready: boolean
  db: DB
  createTrip: (t: NewTrip) => string
  spvDecision: (id: string, approve: boolean, note?: string) => void
  assignTrip: (id: string, driverId: string, plate: string) => void
  scheduleTrip: (id: string, params: { plate: string; driverId?: string; date: string; estDeparture: string; estReturn?: string; adminNote?: string }) => void
  rejectTrip: (id: string, reason: string) => void
  gateGo: (id: string, security: string) => void
  gateBack: (id: string, security: string) => void
  claimCoupon: (id: string) => void
  payCoupon: (id: string, adminName: string) => void
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
const KEY = 'ff_db_v1'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>({ drivers: [], vehicles: [], trips: [] })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY)
    let initial: DB = raw ? (JSON.parse(raw) as DB) : seed()
    // ensure vehicles have status
    if (initial.vehicles && initial.vehicles.some((v) => !v.status)) {
      initial = {
        ...initial,
        vehicles: initial.vehicles.map((v) => ({ ...v, status: v.status || 'Active' })),
      }
    }
    if (!raw) window.localStorage.setItem(KEY, JSON.stringify(initial))
    setDb(initial)
    setReady(true)
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setDb(JSON.parse(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => {
      const next = fn(prev)
      window.localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])
  const patch = useCallback((id: string, p: Partial<Trip> | ((t: Trip) => Partial<Trip>)) =>
    update((d) => ({ ...d, trips: d.trips.map((t) => (t.id === id ? { ...t, ...(typeof p === 'function' ? p(t) : p) } : t)) })), [update])

  const value = useMemo<Ctx>(() => ({
    ready, db,
    createTrip: (t) => {
      const id = `T-${Date.now().toString().slice(-6)}`
      update((d) => ({ ...d, trips: [...d.trips, { ...t, id, date: ymd(), status: 'WAITING_SPV', spvName: `SPV ${t.dept}`, coupon: 'NONE' }] }))
      return id
    },
    spvDecision: (id, approve, note) =>
      patch(id, { status: approve ? 'WAITING_ASSIGN' : 'REJECTED', spvAt: new Date().toISOString(), spvNote: note, rejectReason: approve ? undefined : (note || 'Ditolak oleh SPV') }),
    assignTrip: (id, driverId, plate) => patch(id, { status: 'READY', driverId, plate }),
    scheduleTrip: (id, params) => patch(id, {
      status: 'READY',
      plate: params.plate,
      driverId: params.driverId,
      date: params.date,
      estDeparture: params.estDeparture,
      estReturn: params.estReturn,
      adminNote: params.adminNote,
    }),
    rejectTrip: (id, reason) => patch(id, { status: 'REJECTED', rejectReason: reason }),
    gateGo: (id, security) => patch(id, { status: 'ON_TRIP', timeGo: new Date().toISOString(), securityGo: security }),
    gateBack: (id, security) =>
      patch(id, (t) => {
        const back = new Date().toISOString()
        return { status: 'DONE', timeBack: back, securityBack: security, durationMin: Math.max(0, Math.round((+new Date(back) - +new Date(t.timeGo!)) / 60000)), coupon: couponFromBack(back) }
      }),
    claimCoupon: (id) => patch(id, { coupon: 'CLAIMED', claimedAt: new Date().toISOString() }),
    payCoupon: (id, adminName) => patch(id, { coupon: 'PAID', paidAt: new Date().toISOString(), paidBy: adminName }),
    addDriver: (d) => {
      const id = `d-${Date.now().toString().slice(-5)}`
      update((prev) => ({ ...prev, drivers: [...prev.drivers, { ...d, id, onLeave: false }] }))
    },
    updateDriver: (id, p) =>
      update((prev) => ({ ...prev, drivers: prev.drivers.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
    removeDriver: (id) =>
      update((prev) => ({ ...prev, drivers: prev.drivers.filter((x) => x.id !== id) })),
    toggleLeave: (driverId) => update((d) => ({ ...d, drivers: d.drivers.map((x) => (x.id === driverId ? { ...x, onLeave: !x.onLeave } : x)) })),
    addVehicle: (v) => update((prev) => ({ ...prev, vehicles: [...prev.vehicles, { ...v, status: v.status || 'Active' }] })),
    updateVehicle: (plate, p) => update((prev) => ({ ...prev, vehicles: prev.vehicles.map((v) => (v.plate === plate ? { ...v, ...p } : v)) })),
    removeVehicle: (plate) => update((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.plate !== plate) })),
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
