'use client'

import { useState } from 'react'
import { LogIn, LogOut, ShieldCheck, MapPin, AlertCircle, Info } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { fmtDur, fmtTime, useStore } from '@/lib/store'
import { isJaiLocation } from '@/lib/geo'
import { Card, Empty, PageHeader, Pill, useToast } from '../ui-bits'

export function SecurityGate({ user }: { user: Account }) {
  const { db, gateGo, gateBack } = useStore()
  const notify = useToast()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'

  // Conditional Security Logic:
  // Only show trips if either Origin OR Destination explicitly includes "PT. JAI"
  const readyAll = db.trips.filter((t) => t.status === 'READY')
  const outAll = db.trips.filter((t) => t.status === 'ON_TRIP')

  const tripTouchesJai = (t: typeof db.trips[0]) => {
    const originJai = isJaiLocation(t.origin || 'PT. JAI')
    const destJai = isJaiLocation(t.destination) || (Array.isArray(t.destinations) && t.destinations.some((d) => isJaiLocation(d)))
    return originJai || destJai
  }

  // Filtered trips for Security Gate Clearance (only touches PT. JAI)
  const ready = readyAll.filter(tripTouchesJai)
  const out = outAll.filter(tripTouchesJai)

  // Outside trips (hidden from security, handled 100% by Driver App)
  const outsideReadyCount = readyAll.length - ready.length
  const outsideOutCount = outAll.length - out.length

  const doneToday = db.trips
    .filter((t) => t.status === 'DONE' && t.securityBack)
    .slice(-5)
    .reverse()

  return (
    <>
      <PageHeader 
        title="Gate Clearance" 
        desc={`Paraf digital gerbang · ${user.name}`} 
      />

      {/* Info Banner Keamanan Bersyarat */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-black/40 to-black/30 p-4 text-xs text-[#8fa99b]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Sistem Keamanan Bersyarat Aktif:</span>{' '}
            Hanya menampilkan perjalanan yang melewati gerbang pabrik <span className="text-emerald-300 font-bold">PT. JAI</span>.
          </div>
        </div>
        {(outsideReadyCount > 0 || outsideOutCount > 0) && (
          <div className="flex items-center gap-2 text-[11px] bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-amber-300 shrink-0">
            <Info size={14} />
            <span>{outsideReadyCount + outsideOutCount} trip rute luar dikontrol 100% via Driver App</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Card Siap Berangkat */}
        <Card 
          title="Siap Berangkat (Gerbang PT. JAI)" 
          subtitle="Kendaraan menunggu clearance gerbang keluar pabrik"
        >
          {ready.length === 0 ? (
            <Empty text="Tidak ada kendaraan gerbang siap berangkat." />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {ready.map((t) => {
                const originIsJai = isJaiLocation(t.origin || 'PT. JAI')
                const originLabel = t.origin || 'PT. JAI'

                return (
                  <li key={t.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold tracking-tight">{t.plate}</p>
                          <Pill label={originIsJai ? 'Keluar Gerbang JAI' : 'Start Rute Luar'} tone={originIsJai ? 'green' : 'amber'} />
                        </div>
                        <p className="text-xs text-[#708078] mt-1 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-600 shrink-0" />
                          <span className="font-semibold text-[#0f2419]">{originLabel}</span>
                          <span className="text-[#a3afa8]">→</span>
                          <span className="font-semibold text-[#0f2419]">{t.destination}</span>
                        </p>
                        <p className="text-xs text-[#708078] mt-0.5">
                          Driver: <span className="font-medium text-[#18392b]">{dn(t.driverId)}</span> · Est. {t.estDeparture || '08:00'} WIB
                        </p>
                      </div>
                      <Pill label="Siap" tone="green" />
                    </div>

                    {/* Button BERANGKAT only if Origin is PT. JAI */}
                    {originIsJai ? (
                      <button
                        id={`go-${t.id}`}
                        onClick={() => {
                          gateGo(t.id, user.username)
                          notify(`${t.plate} BERANGKAT ${fmtTime(new Date().toISOString())} WIB`)
                        }}
                        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#075b3d] text-base font-bold text-white shadow-lg shadow-[#075b3d]/25 transition active:scale-[.98]"
                      >
                        <LogOut size={20} />
                        BERANGKAT (GERBANG JAI)
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>Titik awal di luar pabrik ({originLabel}). Validasi keberangkatan dikontrol oleh Driver melalui Driver App.</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Card Sedang Di Luar */}
        <Card 
          title="Sedang Di Luar (Menuju PT. JAI)" 
          subtitle="Klik KEMBALI saat kendaraan masuk gerbang pabrik"
        >
          {out.length === 0 ? (
            <Empty text="Tidak ada kendaraan di luar yang menuju gerbang." />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {out.map((t) => {
                const destIsJai = isJaiLocation(t.destination) || (Array.isArray(t.destinations) && t.destinations.some((d) => isJaiLocation(d))) || t.returnToOrigin !== false

                return (
                  <li key={t.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold tracking-tight">{t.plate}</p>
                          <Pill label={destIsJai ? 'Menuju Gerbang JAI' : 'Tujuan Akhir Luar'} tone={destIsJai ? 'blue' : 'amber'} />
                        </div>
                        <p className="text-xs text-[#708078] mt-1 flex items-center gap-1">
                          <MapPin size={12} className="text-blue-600 shrink-0" />
                          <span className="font-semibold text-[#0f2419]">{t.origin || 'PT. JAI'}</span>
                          <span className="text-[#a3afa8]">→</span>
                          <span className="font-semibold text-[#0f2419]">{t.destination}</span>
                        </p>
                        <p className="text-xs text-[#708078] mt-0.5">
                          Driver: <span className="font-medium text-[#18392b]">{dn(t.driverId)}</span> · Keluar {fmtTime(t.timeGo)} WIB
                        </p>
                      </div>
                      <Pill label="Bertugas" tone="blue" />
                    </div>

                    {/* Button KEMBALI only if Destination is PT. JAI or returns to PT. JAI */}
                    {destIsJai ? (
                      <button
                        id={`back-${t.id}`}
                        onClick={() => {
                          gateBack(t.id, user.username)
                          notify(`${t.plate} KEMBALI tercatat di gerbang`)
                        }}
                        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e08a00] text-base font-bold text-white shadow-lg shadow-[#e08a00]/25 transition active:scale-[.98]"
                      >
                        <LogIn size={20} />
                        KEMBALI (GERBANG JAI)
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>Tujuan akhir di luar pabrik tanpa kembali ke JAI. Validasi kepulangan / selesai trip dikontrol oleh Driver melalui Driver App.</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4" title="Log Terakhir Gerbang PT. JAI">
        {doneToday.length === 0 ? (
          <Empty text="Belum ada log gerbang tercatat hari ini." />
        ) : (
          <ul className="divide-y divide-[#edf1ee]">
            {doneToday.map((t) => (
              <li key={t.id} className="flex justify-between px-5 py-3 text-xs">
                <span className="font-semibold">
                  {t.plate} · {dn(t.driverId)}
                  <span className="ml-2 font-normal text-[#708078]">
                    ({t.origin || 'PT. JAI'} → {t.destination})
                  </span>
                </span>
                <span className="text-[#708078]">
                  {fmtTime(t.timeGo)} → {fmtTime(t.timeBack)} ({fmtDur(t.durationMin)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

