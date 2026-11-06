'use client'

import { useState } from 'react'
import { LogIn, LogOut, ShieldCheck, MapPin, AlertCircle, Info, Calendar, Clock, User, ChevronDown, ChevronUp, FileText, Users } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { fmtDate, fmtDur, fmtTime, useStore, ymd } from '@/lib/store'
import { isJaiLocation } from '@/lib/geo'
import { Card, Empty, PageHeader, Pill, useToast } from '../ui-bits'

export function SecurityGate({ user }: { user: Account }) {
  const { db, gateGo, gateBack } = useStore()
  const notify = useToast()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const vn = (plate?: string) => db.vehicles.find((v) => v.plate === plate)?.type ?? ''

  // State untuk expand detail tambahan pengajuan
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const toggleExpand = (id: string) => setExpandedTripId((prev) => (prev === id ? null : id))

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
                const isToday = t.date === ymd()
                const vehicleType = vn(t.plate)
                const isExpanded = expandedTripId === t.id

                return (
                  <li key={t.id} className="p-5 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Header: Plat, Tipe Mobil, Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-bold tracking-tight text-white">{t.plate}</p>
                          {vehicleType && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                              {vehicleType}
                            </span>
                          )}
                          <Pill label={originIsJai ? 'Keluar Gerbang JAI' : 'Start Rute Luar'} tone={originIsJai ? 'green' : 'amber'} />
                        </div>

                        {/* Tanggal & Waktu Rencana Berangkat */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border ${
                            isToday 
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <Calendar size={13} className="shrink-0" />
                            <span>{fmtDate(t.date)}</span>
                            {isToday && <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-white uppercase tracking-wider">Hari Ini</span>}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-200 font-medium">
                            <Clock size={13} className="shrink-0 text-emerald-400" />
                            <span>Rencana: <b className="text-white">{t.estDeparture || '08:00'}</b> {t.estReturn ? `– ${t.estReturn}` : ''} WIB</span>
                          </span>
                        </div>

                        {/* Rute Perjalanan */}
                        <p className="text-xs text-emerald-100/80 mt-2 flex items-center gap-1.5 flex-wrap">
                          <MapPin size={13} className="text-emerald-400 shrink-0" />
                          <span className="font-semibold text-white">{originLabel}</span>
                          <span className="text-emerald-400/60 font-bold">→</span>
                          <span className="font-semibold text-white">{t.destination}</span>
                        </p>

                        {/* Driver & Pemohon */}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-emerald-100/70 flex-wrap">
                          <p>
                            Driver: <span className="font-semibold text-emerald-300">{dn(t.driverId)}</span>
                          </p>
                          <span className="text-white/20">•</span>
                          <p className="flex items-center gap-1">
                            <User size={12} className="text-emerald-400/80 shrink-0" />
                            Pemohon: <span className="font-medium text-white">{t.requesterName}</span> ({t.dept}{t.section ? ` - ${t.section}` : ''})
                          </p>
                        </div>

                        {/* Toggle Detail Tambahan (Keperluan / Penumpang) */}
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(t.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 hover:text-emerald-300 transition underline underline-offset-2"
                          >
                            <FileText size={12} />
                            <span>{isExpanded ? 'Tutup Detail Pengajuan' : 'Lihat Detail Pengajuan & Keperluan'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-emerald-100/80 space-y-1.5 anim-fade-in">
                              <p>
                                <span className="text-[#8fa99b]">Keperluan / Tujuan:</span>{' '}
                                <span className="font-medium text-white">{t.purpose || '—'}</span>
                              </p>
                              {t.passengers && t.passengers.length > 0 ? (
                                <p className="flex items-start gap-1">
                                  <Users size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                  <span>
                                    <span className="text-[#8fa99b]">Penumpang ({t.passengers.length}):</span>{' '}
                                    <span className="font-medium text-white">
                                      {t.passengers.map((p) => `${p.name} (${p.dept})`).join(', ')}
                                    </span>
                                  </span>
                                </p>
                              ) : t.driverOnly ? (
                                <p className="text-amber-300 text-[11px] font-medium">
                                  ⚠️ Pengantaran dokumen/barang saja (Driver Only - Tanpa penumpang)
                                </p>
                              ) : null}
                              {t.adminNote && (
                                <p className="text-[11px] text-[#93a097] border-t border-white/5 pt-1.5 mt-1.5">
                                  <span>Catatan Admin:</span> <span className="text-white">{t.adminNote}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
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
                const isToday = t.date === ymd()
                const vehicleType = vn(t.plate)
                const isExpanded = expandedTripId === t.id

                return (
                  <li key={t.id} className="p-5 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Header: Plat, Tipe Mobil, Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-bold tracking-tight text-white">{t.plate}</p>
                          {vehicleType && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium">
                              {vehicleType}
                            </span>
                          )}
                          <Pill label={destIsJai ? 'Menuju Gerbang JAI' : 'Tujuan Akhir Luar'} tone={destIsJai ? 'blue' : 'amber'} />
                        </div>

                        {/* Tanggal & Jam Keluar */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border ${
                            isToday 
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30 ring-1 ring-sky-500/20' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <Calendar size={13} className="shrink-0" />
                            <span>{fmtDate(t.date)}</span>
                            {isToday && <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-sky-500/30 text-white uppercase tracking-wider">Hari Ini</span>}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-sky-200 font-medium">
                            <Clock size={13} className="shrink-0 text-sky-400" />
                            <span>Keluar: <b className="text-white">{fmtTime(t.timeGo)} WIB</b></span>
                          </span>
                        </div>

                        {/* Rute Perjalanan */}
                        <p className="text-xs text-sky-100/80 mt-2 flex items-center gap-1.5 flex-wrap">
                          <MapPin size={13} className="text-sky-400 shrink-0" />
                          <span className="font-semibold text-white">{t.origin || 'PT. JAI'}</span>
                          <span className="text-sky-400/60 font-bold">→</span>
                          <span className="font-semibold text-white">{t.destination}</span>
                        </p>

                        {/* Driver & Pemohon */}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-sky-100/70 flex-wrap">
                          <p>
                            Driver: <span className="font-semibold text-sky-300">{dn(t.driverId)}</span>
                          </p>
                          <span className="text-white/20">•</span>
                          <p className="flex items-center gap-1">
                            <User size={12} className="text-sky-400/80 shrink-0" />
                            Pemohon: <span className="font-medium text-white">{t.requesterName}</span> ({t.dept}{t.section ? ` - ${t.section}` : ''})
                          </p>
                        </div>

                        {/* Toggle Detail Tambahan (Keperluan / Penumpang) */}
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(t.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400/90 hover:text-sky-300 transition underline underline-offset-2"
                          >
                            <FileText size={12} />
                            <span>{isExpanded ? 'Tutup Detail Pengajuan' : 'Lihat Detail Pengajuan & Keperluan'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-sky-100/80 space-y-1.5 anim-fade-in">
                              <p>
                                <span className="text-[#8fa99b]">Keperluan / Tujuan:</span>{' '}
                                <span className="font-medium text-white">{t.purpose || '—'}</span>
                              </p>
                              {t.passengers && t.passengers.length > 0 ? (
                                <p className="flex items-start gap-1">
                                  <Users size={13} className="text-sky-400 shrink-0 mt-0.5" />
                                  <span>
                                    <span className="text-[#8fa99b]">Penumpang ({t.passengers.length}):</span>{' '}
                                    <span className="font-medium text-white">
                                      {t.passengers.map((p) => `${p.name} (${p.dept})`).join(', ')}
                                    </span>
                                  </span>
                                </p>
                              ) : t.driverOnly ? (
                                <p className="text-amber-300 text-[11px] font-medium">
                                  ⚠️ Pengantaran dokumen/barang saja (Driver Only - Tanpa penumpang)
                                </p>
                              ) : null}
                              {t.adminNote && (
                                <p className="text-[11px] text-[#93a097] border-t border-white/5 pt-1.5 mt-1.5">
                                  <span>Catatan Admin:</span> <span className="text-white">{t.adminNote}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
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
                <span className="font-semibold text-white">
                  {t.plate} · <span className="text-emerald-300">{dn(t.driverId)}</span>
                  <span className="ml-2 font-normal text-emerald-100/70">
                    ({t.origin || 'PT. JAI'} → {t.destination})
                  </span>
                </span>
                <span className="text-emerald-100/70 font-mono">
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

