'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Map as MapIcon } from 'lucide-react'
import { ORIGIN_POINT, routeForDestinations, type RouteResult, type GeoPlace } from '@/lib/geo'

// Leaflet mengakses `window`, jadi hanya dirender di client
export const RouteMap = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-white/10 bg-black/30 text-xs text-[#8fa99b]">
      <Loader2 size={16} className="mr-2 animate-spin" /> Memuat peta…
    </div>
  ),
})

/** Peta rute untuk detail pengajuan: geocode tujuan (Nominatim) lalu rute (OSRM). */
export function TripRouteMap({ destinations, destination, height = 260 }: { destinations?: string[]; destination?: string; height?: number }) {
  const list = (destinations && destinations.filter(Boolean).length ? destinations : destination ? destination.split('➔') : []).map((s) => s.trim()).filter(Boolean)
  const key = list.join('|')
  const [state, setState] = useState<{ places: GeoPlace[]; route: RouteResult | null; missing: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!list.length) return
    const ctrl = new AbortController()
    setLoading(true)
    routeForDestinations(list, ctrl.signal)
      .then(setState)
      .catch((e) => e?.name !== 'AbortError' && setState(null))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!list.length) return null
  if (loading && !state)
    return (
      <div className="flex items-center gap-2 py-3 text-[11px] text-[#8fa99b]">
        <Loader2 size={14} className="animate-spin" /> Menghitung rute…
      </div>
    )
  if (!state || state.places.length === 0)
    return <p className="py-2 text-[11px] text-amber-400">Lokasi tujuan tidak ditemukan di peta OpenStreetMap.</p>

  return (
    <div className="space-y-1.5">
      <RouteMap points={[ORIGIN_POINT, ...state.places]} line={state.route?.line ?? []} height={height} />
      {state.route && (
        <p className="flex items-center gap-1.5 text-[10px] text-[#8fa99b]">
          <MapIcon size={11} />
          Rute PP dari PT. JAI: {state.route.km} KM · ~{state.route.minutes} menit
          {state.route.approximate && ' (perkiraan garis lurus, server rute tidak tersedia)'}
        </p>
      )}
    </div>
  )
}

/** Tombol buka/tutup peta rute untuk daftar/detail pengajuan. */
export function TripRouteToggle({ trip, tone = 'dark' }: { trip: { destinations?: string[]; destination?: string }; tone?: 'dark' | 'light' }) {
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
          <TripRouteMap destinations={trip.destinations} destination={trip.destination} />
        </div>
      )}
    </div>
  )
}
