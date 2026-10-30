'use client'

import React, { useEffect, useState, Component, type ErrorInfo, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Loader2, Map as MapIcon } from 'lucide-react'
import { ORIGIN_POINT, routeForDestinations, normalizeDestinations, type RouteResult, type GeoPlace } from '@/lib/geo'

// Leaflet mengakses `window`, jadi hanya dirender di client
export const RouteMap = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-white/10 bg-black/30 text-xs text-[#8fa99b]">
      <Loader2 size={16} className="mr-2 animate-spin" /> Memuat peta…
    </div>
  ),
})

/** Error Boundary untuk memastikan peta Leaflet tidak pernah menggagalkan seluruh halaman */
class MapErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Map render boundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertCircle size={15} className="shrink-0" />
            <span>Peta rute tidak dapat dimuat pada perangkat/jaringan ini. Detail perjalanan tetap aman.</span>
          </div>
        )
      )
    }
    return this.props.children
  }
}

/** Peta rute untuk detail pengajuan: geocode tujuan lalu rute (OSRM). */
export function TripRouteMap({
  destinations,
  destination,
  height = 260,
  focusPointIndex,
}: {
  destinations?: any
  destination?: string
  height?: number
  focusPointIndex?: number | null // 0: Origin PT. JAI, 1: Titik 1, 2: Titik 2, dst.
}) {
  const list = normalizeDestinations(destinations, destination)
  const key = list.join('|')
  const [state, setState] = useState<{ places: GeoPlace[]; route: RouteResult | null; missing: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!list.length) return
    const ctrl = new AbortController()
    setLoading(true)
    routeForDestinations(list, ctrl.signal)
      .then(setState)
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          setState(null)
        }
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!list.length) return null

  if (loading && !state) {
    return (
      <div className="flex items-center gap-2 py-3 text-[11px] text-[#8fa99b]">
        <Loader2 size={14} className="animate-spin text-[#a3e635]" /> Menghitung titik koordinat & rute peta…
      </div>
    )
  }

  if (!state || state.places.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-[11px] text-[#8fa99b]">
        <p className="font-semibold text-amber-400">Lokasi tujuan: &quot;{list.join(' ➔ ')}&quot;</p>
        <p className="mt-0.5 text-[10px] text-[#708078]">Peta akan otomatis menampilkan jalur setelah titik geolokasi ditemukan.</p>
      </div>
    )
  }

  const allPoints = [ORIGIN_POINT, ...state.places]
  const targetFocus =
    typeof focusPointIndex === 'number' && focusPointIndex >= 0 && focusPointIndex < allPoints.length
      ? allPoints[focusPointIndex]
      : null

  return (
    <MapErrorBoundary>
      <div className="space-y-1.5">
        <RouteMap
          points={allPoints}
          line={state.route?.line ?? []}
          height={height}
          focusPoint={targetFocus}
        />
        {state.route && (
          <p className="flex items-center gap-1.5 text-[10px] text-[#8fa99b]">
            <MapIcon size={11} className="text-[#a3e635]" />
            Rute PP dari PT. JAI: <strong className="text-white">{state.route.km} KM</strong> · ~{state.route.minutes} menit
            {state.route.approximate && ' (perkiraan garis lurus)'}
          </p>
        )}
      </div>
    </MapErrorBoundary>
  )
}

/** Tombol buka/tutup peta rute untuk daftar/detail pengajuan. */
export function TripRouteToggle({
  trip,
  tone = 'dark',
}: {
  trip: { destinations?: any; destination?: string }
  tone?: 'dark' | 'light'
}) {
  const [open, setOpen] = useState(false)
  const cls =
    tone === 'dark'
      ? 'border-[#a3e635]/30 text-[#bef264] hover:bg-[#a3e635]/10'
      : 'border-[#b8cfc2] text-[#176c4b] hover:bg-[#eef5f0]'

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition ${cls}`}
      >
        <MapIcon size={12} /> {open ? 'Sembunyikan Peta Rute' : 'Lihat Peta Rute'}
      </button>
      {open && (
        <div className="mt-2 max-w-xl">
          <MapErrorBoundary>
            <TripRouteMap destinations={trip?.destinations} destination={trip?.destination} />
          </MapErrorBoundary>
        </div>
      )}
    </div>
  )
}
