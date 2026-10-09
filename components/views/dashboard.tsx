'use client'

import { useState } from 'react'
import { BusFront, Clock3, FileText, Truck, UserRound } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { driverState, fmtDur, fmtTime, useStore, vehicleState, ymd } from '@/lib/store'
import { Card, PageHeader, Pill } from '../ui-bits'
import { VehicleTimelineScheduler } from '../vehicle-timeline-scheduler'

const COLS = [
  { key: 'Tersedia', tone: 'green' },
  { key: 'Sedang Bertugas', tone: 'blue' },
  { key: 'Cuti', tone: 'gray' },
] as const

export function WorkloadCard() {
  const { db } = useStore()
  const [targetType, setTargetType] = useState<'driver' | 'vehicle'>('driver')
  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const today = ymd()
  const currentMonthPrefix = today.slice(0, 7) // YYYY-MM
  const now = Date.now()

  // Driver metrics
  const driverRows = db.drivers.map((d) => {
    const driverTrips = db.trips.filter((t) => {
      if (t.driverId !== d.id || t.status === 'READY') return false
      return period === 'day' ? t.date === today : t.date.startsWith(currentMonthPrefix)
    })

    const totalMins = driverTrips.reduce((s, t) => {
      if (t.status === 'DONE') return s + (t.durationMin ?? 0)
      if (t.status === 'ON_TRIP' && t.timeGo) return s + Math.round((now - +new Date(t.timeGo)) / 60000)
      return s
    }, 0)

    const totalKm = driverTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0)
    const tripCount = driverTrips.length

    return {
      id: d.id,
      title: d.name,
      badge: d.defaultPlate,
      mins: totalMins,
      km: Math.round(totalKm * 10) / 10,
      trips: tripCount,
    }
  })

  // Vehicle metrics (akumulasi durasi dan KM paralel pada profil fisik kendaraan)
  const vehicleRows = db.vehicles.map((v) => {
    const vTrips = db.trips.filter((t) => {
      // Must match plate and not just in pending/ready state
      if (t.plate !== v.plate || t.status === 'READY') return false
      return period === 'day' ? t.date === today : t.date.startsWith(currentMonthPrefix)
    })

    const totalMins = vTrips.reduce((s, t) => {
      if (t.status === 'DONE') return s + (t.durationMin ?? 0)
      if (t.status === 'ON_TRIP' && t.timeGo) return s + Math.round((now - +new Date(t.timeGo)) / 60000)
      return s
    }, 0)

    const totalKm = vTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0)
    const tripCount = vTrips.length

    return {
      id: v.plate,
      title: v.plate,
      badge: `${v.type} (${v.category || 'Mobil Operasional'})`,
      mins: totalMins,
      km: Math.round(totalKm * 10) / 10,
      trips: tripCount,
    }
  })

  const currentRows = targetType === 'driver' ? driverRows : vehicleRows
  const maxKm = Math.max(100, ...currentRows.map((r) => r.km))

  return (
    <Card
      title={targetType === 'driver' ? 'Statistik Beban Kerja Driver' : 'Statistik Beban Kerja & Utilisasi Armada'}
      subtitle={`Akumulasi paralel jarak tempuh (KM) & durasi fisik ${targetType === 'driver' ? 'Driver' : 'Kendaraan'} (${period === 'day' ? 'Hari Ini' : 'Bulan Ini'})`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Type Tab: Driver vs Kendaraan */}
          <div className="flex items-center gap-1 rounded-xl bg-black/40 border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setTargetType('driver')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                targetType === 'driver'
                  ? 'bg-emerald-500 text-black font-bold shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              👨‍✈️ Driver
            </button>
            <button
              type="button"
              onClick={() => setTargetType('vehicle')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                targetType === 'vehicle'
                  ? 'bg-emerald-500 text-black font-bold shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              🚗 Kendaraan
            </button>
          </div>

          {/* Period Tab: Day vs Month */}
          <div className="flex items-center gap-1 rounded-xl bg-black/30 border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                period === 'day'
                  ? 'bg-[#a3e635] text-[#052e16] font-bold shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                period === 'month'
                  ? 'bg-[#a3e635] text-[#052e16] font-bold shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {currentRows.map(({ id, title, badge, mins, km, trips }, i) => (
          <div key={id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-[#a3e635]/25">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-[13px]">{title}</span>
                {badge && (
                  <span className="font-mono text-[10px] text-[#8fa99b] bg-white/5 px-1.5 py-0.5 rounded">
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-[#bef264] flex items-center gap-1 bg-[#a3e635]/15 border border-[#a3e635]/30 px-2 py-0.5 rounded-full">
                  🚗 {km} KM
                </span>
                <span className="text-[#8fa99b]">{fmtDur(mins)}</span>
                <span className="text-[11px] text-[#708078]">{trips} trip</span>
              </div>
            </div>

            {/* Progress bar normalized to KM */}
            <div className="h-2.5 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,.6)]">
              <div
                className="anim-grow-x relative h-full rounded-full bg-gradient-to-r from-[#4d7c0f] via-[#84cc16] to-[#d9f99d] shadow-[0_0_18px_rgba(163,230,53,.55),inset_0_2px_0_rgba(255,255,255,.35)]"
                style={{ width: `${Math.min(100, (km / maxKm) * 100)}%`, animationDelay: `${i * 0.08}s` }}
              >
                <span className="shimmer absolute inset-0 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Dashboard({ user }: { user: Account }) {
  const { db, toggleLeave } = useStore()
  const isAdmin = user.role === 'admin'
  const today = ymd()
  const todays = db.trips.filter((t) => t.date === today)
  const active = db.trips.filter((t) => t.status === 'ON_TRIP')
  const availVeh = db.vehicles.filter((v) => vehicleState(db, v.plate) === 'Tersedia').length

  return (
    <>
      <PageHeader title="Dashboard" desc={`Status armada & driver secara real-time · ${user.title}`} />
      <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: 'Sedang Bertugas', v: active.length, h: 'kendaraan di luar pabrik', i: Truck, c: 'from-[#b7f04a] to-[#65a30d] text-[#052e16]', hero: true },
          { l: 'Kendaraan Tersedia', v: availVeh, h: `dari ${db.vehicles.length} kendaraan`, i: BusFront, c: 'from-[#166534] to-[#0a3821] text-white', accentText: 'text-[#d9f99d]' },
          { l: 'Driver Tersedia', v: db.drivers.filter((d) => driverState(db, d.id) === 'Tersedia').length, h: `dari ${db.drivers.length} driver`, i: UserRound, c: 'from-[#1e4e3b] to-[#0c2a1e] text-white', accentText: 'text-[#bef264]' },
          { l: 'Pengajuan Hari Ini', v: todays.length, h: `${todays.filter((t) => t.status === 'DONE').length} selesai`, i: FileText, c: 'from-[#1f4a25] to-[#0b2411] text-white', accentText: 'text-[#86efac]' },
        ].map((m) => (
          <div key={m.l} className={`tilt relative overflow-hidden rounded-2xl border border-[#a3e635]/25 bg-gradient-to-br p-5 shadow-[0_22px_40px_-20px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,255,255,.2)] ${m.c}`}>
            <div className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl ${m.hero ? 'bg-white/40' : 'bg-[#a3e635]/25'}`} />
            <div className="relative flex items-start justify-between">
              <p className={`text-xs font-bold tracking-wide ${m.hero ? 'text-[#052e16]' : 'text-white'}`}>{m.l}</p>
              <div className={`flex size-9 items-center justify-center rounded-xl shadow-inner ${m.hero ? 'bg-[#052e16]/85 text-[#a3e635]' : 'bg-[#a3e635]/20 text-[#a3e635] ring-1 ring-[#a3e635]/40'}`}>
                <m.i size={16} />
              </div>
            </div>
            <p className={`relative mt-5 text-4xl font-extrabold tracking-tight ${m.hero ? 'text-[#052e16]' : 'text-white'}`} style={{ textShadow: m.hero ? 'none' : '0 2px 14px rgba(0,0,0,.6)' }}>
              {String(m.v).padStart(2, '0')}
            </p>
            <p className={`relative mt-1 text-[11px] font-medium ${m.hero ? 'text-[#052e16]/80' : 'text-[#d1fae5]'}`}>{m.h}</p>
          </div>
        ))}
      </section>

      {/* Live Resource Timeline Calendar (View-Only Mode for Universal Dashboard) */}
      <section className="mt-4">
        <VehicleTimelineScheduler
          vehicles={db.vehicles}
          bookings={db.trips}
          user={user}
          interactive={false}
        />
      </section>

      <Card className="mt-4" title="Live Fleet Kanban" subtitle={isAdmin ? 'Driver · detail tujuan tampil untuk Admin' : 'Driver & kendaraan · detail tamu/tujuan disembunyikan'}>
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {COLS.map((col) => {
            const list = db.drivers.filter((d) => driverState(db, d.id) === col.key)
            return (
              <div key={col.key} className="rounded-xl bg-[#f5f8f6] p-3">
                <div className="mb-3 flex items-center justify-between px-1"><Pill label={col.key} tone={col.tone} /><span className="text-[11px] font-bold text-[#708078]">{list.length}</span></div>
                <div className="space-y-2">
                  {list.length === 0 && <p className="py-4 text-center text-[11px] text-[#a3afa8]">Kosong</p>}
                  {list.map((d) => {
                    const trip = db.trips.find((t) => t.driverId === d.id && (t.status === 'READY' || t.status === 'ON_TRIP'))
                    return (
                      <div key={d.id} className="rounded-xl border border-[#e4ece6] bg-white p-3 text-xs">
                        <div className="flex items-center gap-2 font-bold"><UserRound size={14} className="text-[#087348]" />{d.name}</div>
                        {trip && (
                          <div className="mt-2 space-y-1 text-[11px] text-[#708078]">
                            <p className="flex items-center gap-1.5"><Truck size={12} />{trip.plate}</p>
                            <p className="flex items-center gap-1.5"><Clock3 size={12} />{trip.status === 'ON_TRIP' ? `Keluar ${fmtTime(trip.timeGo)}` : 'Siap berangkat'}</p>
                            {isAdmin && <p className="rounded-md bg-[#f1f5f2] px-2 py-1 text-[#4b5b52]">{trip.guest} → {trip.destination}</p>}
                          </div>
                        )}
                        {isAdmin && !trip && (
                          <button onClick={() => toggleLeave(d.id)} className="mt-2 text-[10px] font-bold text-[#087348] hover:underline">{d.onLeave ? 'Tandai Masuk' : 'Tandai Cuti'}</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid gap-3 border-t border-[#edf1ee] p-5 sm:grid-cols-2 xl:grid-cols-4">
          {db.vehicles.map((v) => {
            const s = vehicleState(db, v.plate)
            return (
              <div key={v.plate} className="rounded-xl border border-[#e4ece6] bg-[#f7faf8] p-3">
                <div className="flex items-start justify-between"><div className="flex size-8 items-center justify-center rounded-lg bg-[#d9f0e2] text-[#087348]"><Truck size={16} /></div><Pill label={s} tone={s === 'Tersedia' ? 'green' : 'blue'} /></div>
                <p className="mt-3 text-xs font-bold">{v.plate}</p><p className="text-[10px] text-[#93a097]">{v.type}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {isAdmin && <div className="mt-4"><WorkloadCard /></div>}
    </>
  )
}
