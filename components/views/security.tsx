'use client'

import { useState, useMemo } from 'react'
import {
  LogIn,
  LogOut,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { fmtDate, fmtDur, fmtTime, useStore, ymd, canStartTripNow, type Trip } from '@/lib/store'
import { isJaiLocation } from '@/lib/geo'
import { Card, Empty, PageHeader, Pill, useToast } from '../ui-bits'
import { ModalPortal } from '../modal-portal'

export function SecurityGate({ user }: { user: Account }) {
  const { db, gateGo, gateBack } = useStore()
  const notify = useToast()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const vn = (plate?: string) => db.vehicles.find((v) => v.plate === plate)?.type ?? ''

  // State untuk expand detail tambahan pengajuan
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const toggleExpand = (id: string) => setExpandedTripId((prev) => (prev === id ? null : id))

  // State modal konfirmasi Gate Out (Berangkat) & Gate In (Kembali)
  const [confirmGoTrip, setConfirmGoTrip] = useState<Trip | null>(null)
  const [confirmBackTrip, setConfirmBackTrip] = useState<Trip | null>(null)

  // State filter & pagination untuk mengurangi scroll
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY'>('ALL')
  const [rowsPerPageReady, setRowsPerPageReady] = useState<number>(10)
  const [pageReady, setPageReady] = useState(1)
  const [rowsPerPageOut, setRowsPerPageOut] = useState<number>(10)
  const [pageOut, setPageOut] = useState(1)

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
  const readyRaw = readyAll.filter(tripTouchesJai)
  const outRaw = outAll.filter(tripTouchesJai)

  // Filter pencarian dan tanggal
  const filterList = (list: typeof readyRaw) => {
    return list.filter((t) => {
      if (dateFilter === 'TODAY' && t.date !== ymd()) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const plate = (t.plate || '').toLowerCase()
      const driver = dn(t.driverId).toLowerCase()
      const req = (t.requesterName || '').toLowerCase()
      const dest = (t.destination || '').toLowerCase()
      const vtype = vn(t.plate).toLowerCase()
      return plate.includes(q) || driver.includes(q) || req.includes(q) || dest.includes(q) || vtype.includes(q)
    })
  }

  const ready = useMemo(() => filterList(readyRaw), [readyRaw, searchQuery, dateFilter])
  const out = useMemo(() => filterList(outRaw), [outRaw, searchQuery, dateFilter])

  // Pagination Ready
  const totalPagesReady = Math.max(1, Math.ceil(ready.length / rowsPerPageReady))
  const paginatedReady = useMemo(() => {
    const start = (pageReady - 1) * rowsPerPageReady
    return ready.slice(start, start + rowsPerPageReady)
  }, [ready, pageReady, rowsPerPageReady])

  // Pagination Out
  const totalPagesOut = Math.max(1, Math.ceil(out.length / rowsPerPageOut))
  const paginatedOut = useMemo(() => {
    const start = (pageOut - 1) * rowsPerPageOut
    return out.slice(start, start + rowsPerPageOut)
  }, [out, pageOut, rowsPerPageOut])

  // Reset page jika hasil filter berubah
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setPageReady(1)
    setPageOut(1)
  }

  const handleDateFilterChange = (val: 'ALL' | 'TODAY') => {
    setDateFilter(val)
    setPageReady(1)
    setPageOut(1)
  }

  // Outside trips (hidden from security, handled 100% by Driver App)
  const outsideReadyCount = readyAll.length - readyRaw.length
  const outsideOutCount = outAll.length - outRaw.length

  const doneToday = db.trips
    .filter((t) => t.status === 'DONE' && t.securityBack)
    .slice(-10)
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

      {/* Toolbar Filter Cepat & Pencarian */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Cari plat nomor, nama driver, pemohon, tujuan, tipe mobil..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl p-1 bg-black/40 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => handleDateFilterChange('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                dateFilter === 'ALL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Semua Jadwal
            </button>
            <button
              type="button"
              onClick={() => handleDateFilterChange('TODAY')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                dateFilter === 'TODAY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Hanya Hari Ini
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Card Siap Berangkat */}
        <Card 
          title="Siap Berangkat (Gerbang PT. JAI)" 
          subtitle="Kendaraan menunggu clearance gerbang keluar pabrik"
          action={
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>Tampil:</span>
              <select
                value={rowsPerPageReady}
                onChange={(e) => {
                  setRowsPerPageReady(Number(e.target.value))
                  setPageReady(1)
                }}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
          }
        >
          {ready.length === 0 ? (
            <Empty text="Tidak ada kendaraan gerbang siap berangkat." />
          ) : (
            <>
              <ul className="divide-y divide-[#edf1ee]">
                {paginatedReady.map((t) => {
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
                        (() => {
                          const check = canStartTripNow(t.date, t.estDeparture)
                          if (!check.allowed) {
                            return (
                              <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                                <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                                <div>
                                  <span className="font-bold text-white block">Belum Waktu Keberangkatan</span>
                                  <span className="text-[11px] leading-relaxed text-amber-200/90">{check.reason}</span>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <button
                              id={`go-${t.id}`}
                              type="button"
                              onClick={() => setConfirmGoTrip(t)}
                              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#075b3d] hover:bg-[#09734e] text-base font-bold text-white shadow-lg shadow-[#075b3d]/25 transition active:scale-[.98]"
                            >
                              <LogOut size={20} />
                              BERANGKAT (GERBANG JAI)
                            </button>
                          )
                        })()
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

              {/* Pagination Footer Ready */}
              {totalPagesReady > 1 && (
                <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-white/70">
                  <span>
                    Menampilkan <b>{(pageReady - 1) * rowsPerPageReady + 1}</b> - <b>{Math.min(pageReady * rowsPerPageReady, ready.length)}</b> dari <b>{ready.length}</b> data
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pageReady <= 1}
                      onClick={() => setPageReady((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2 font-medium text-white">
                      Hal {pageReady} / {totalPagesReady}
                    </span>
                    <button
                      type="button"
                      disabled={pageReady >= totalPagesReady}
                      onClick={() => setPageReady((p) => Math.min(totalPagesReady, p + 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Card Sedang Di Luar */}
        <Card 
          title="Sedang Di Luar (Menuju PT. JAI)" 
          subtitle="Klik KEMBALI saat kendaraan masuk gerbang pabrik"
          action={
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>Tampil:</span>
              <select
                value={rowsPerPageOut}
                onChange={(e) => {
                  setRowsPerPageOut(Number(e.target.value))
                  setPageOut(1)
                }}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
          }
        >
          {out.length === 0 ? (
            <Empty text="Tidak ada kendaraan di luar yang menuju gerbang." />
          ) : (
            <>
              <ul className="divide-y divide-[#edf1ee]">
                {paginatedOut.map((t) => {
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
                          type="button"
                          onClick={() => setConfirmBackTrip(t)}
                          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e08a00] hover:bg-[#c97b00] text-base font-bold text-white shadow-lg shadow-[#e08a00]/25 transition active:scale-[.98]"
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

              {/* Pagination Footer Out */}
              {totalPagesOut > 1 && (
                <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-white/70">
                  <span>
                    Menampilkan <b>{(pageOut - 1) * rowsPerPageOut + 1}</b> - <b>{Math.min(pageOut * rowsPerPageOut, out.length)}</b> dari <b>{out.length}</b> data
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pageOut <= 1}
                      onClick={() => setPageOut((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2 font-medium text-white">
                      Hal {pageOut} / {totalPagesOut}
                    </span>
                    <button
                      type="button"
                      disabled={pageOut >= totalPagesOut}
                      onClick={() => setPageOut((p) => Math.min(totalPagesOut, p + 1))}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-white"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
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

      {/* MODAL KONFIRMASI BERANGKAT (GATE OUT) */}
      {confirmGoTrip && (
        <ModalPortal onClose={() => setConfirmGoTrip(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#0a2418] border border-emerald-500/40 p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <LogOut size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfirmasi Keberangkatan</h3>
                  <p className="text-xs text-emerald-300 font-mono">{confirmGoTrip.plate} • {confirmGoTrip.id}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setConfirmGoTrip(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-black/40 p-3.5 rounded-xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Driver:</span>
                <span className="font-semibold text-emerald-300">{dn(confirmGoTrip.driverId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Pemohon:</span>
                <span className="font-semibold text-white">{confirmGoTrip.requesterName} ({confirmGoTrip.dept})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Tujuan:</span>
                <span className="font-semibold text-white">{confirmGoTrip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Jadwal Rencana:</span>
                <span className="font-medium text-emerald-300">{fmtDate(confirmGoTrip.date)} • {confirmGoTrip.estDeparture} WIB</span>
              </div>
            </div>

            <p className="text-xs text-[#8fa99b] leading-relaxed">
              Apakah Anda yakin ingin mencatat kendaraan ini <b className="text-white">BERANGKAT</b> keluar dari Gerbang PT. JAI sekarang?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmGoTrip(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  gateGo(confirmGoTrip.id, user.username)
                  notify(`${confirmGoTrip.plate} BERANGKAT ${fmtTime(new Date().toISOString())} WIB`)
                  setConfirmGoTrip(null)
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition active:scale-95"
              >
                <CheckCircle2 size={15} />
                Ya, Catat Berangkat
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL KONFIRMASI KEMBALI (GATE IN) */}
      {confirmBackTrip && (
        <ModalPortal onClose={() => setConfirmBackTrip(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-[#1f1a0e] border border-amber-500/40 p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <LogIn size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfirmasi Kepulangan (Masuk Gerbang)</h3>
                  <p className="text-xs text-amber-300 font-mono">{confirmBackTrip.plate} • {confirmBackTrip.id}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setConfirmBackTrip(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-black/40 p-3.5 rounded-xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Driver:</span>
                <span className="font-semibold text-amber-300">{dn(confirmBackTrip.driverId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Jam Keluar:</span>
                <span className="font-semibold text-white">{fmtTime(confirmBackTrip.timeGo)} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Rute:</span>
                <span className="font-semibold text-white">{confirmBackTrip.origin || 'PT. JAI'} → {confirmBackTrip.destination}</span>
              </div>
            </div>

            <p className="text-xs text-[#8fa99b] leading-relaxed">
              Apakah Anda yakin ingin mencatat kendaraan ini <b className="text-white">KEMBALI MASUK</b> ke Gerbang PT. JAI dan menyelesaikan perjalanan?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBackTrip(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  gateBack(confirmBackTrip.id, user.username)
                  notify(`${confirmBackTrip.plate} KEMBALI tercatat di gerbang`)
                  setConfirmBackTrip(null)
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white shadow-lg shadow-amber-950/50 flex items-center gap-1.5 transition active:scale-95"
              >
                <CheckCircle2 size={15} />
                Ya, Catat Masuk Gerbang
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

