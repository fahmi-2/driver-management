'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Compass, Loader2, Lock, MapPin, Navigation, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { inputCls } from './ui-bits'
import { RouteMap } from './route-map'
import {
  ORIGIN_POINT,
  rememberPlace,
  routeForDestinations,
  searchPlaces,
  type GeoPlace,
  type RouteResult,
} from '@/lib/geo'

/** Titik awal/akhir tetap: PT. JAI Pasuruan */
export const FACTORY_ORIGIN = {
  name: ORIGIN_POINT.label,
  address: 'Jl. Raya Wonoayu No. 26, Gempol, Pasuruan, Jawa Timur 67155',
  lat: ORIGIN_POINT.lat,
  lng: ORIGIN_POINT.lng,
}

interface DestinationAutocompleteProps {
  value: string
  destinations?: string[]
  distanceKm?: number
  durationMins?: number
  onChange: (data: {
    destination: string
    destinations: string[]
    distance_km?: number
    estimated_duration_minutes?: number
  }) => void
}

export function DestinationAutocomplete({
  value,
  destinations: propDestinations,
  distanceKm,
  durationMins,
  onChange,
}: DestinationAutocompleteProps) {
  const destinations = propDestinations && propDestinations.length > 0 ? propDestinations : value ? [value] : ['']

  const destRef = useRef(destinations)
  destRef.current = destinations
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const [committed, setCommitted] = useState<string[]>([])
  const [calculating, setCalculating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mapData, setMapData] = useState<{ places: GeoPlace[]; route: RouteResult | null } | null>(null)

  // ---- Autocomplete (Nominatim) dengan debounce 600ms (kebijakan ±1 req/detik) ----
  useEffect(() => {
    if (activeIdx === null) return
    const q = (destinations[activeIdx] || '').trim()
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        setSuggestions(await searchPlaces(q, ctrl.signal))
      } catch (e: any) {
        if (e?.name !== 'AbortError') setSearchError(true)
      } finally {
        setSearching(false)
      }
    }, 600)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, activeIdx !== null ? destinations[activeIdx] : ''])

  // ---- Hitung rute (geocode + OSRM) setiap daftar tujuan "dikunci" ----
  const committedKey = committed.map((d) => d.trim()).filter(Boolean).join('|')
  useEffect(() => {
    const names = committed.map((d) => d.trim()).filter(Boolean)
    if (names.length === 0) {
      setMapData(null)
      setNotice(null)
      return
    }
    const ctrl = new AbortController()
    setCalculating(true)
    routeForDestinations(names, ctrl.signal)
      .then(({ places, missing, route }) => {
        if (ctrl.signal.aborted) return
        setMapData({ places, route })
        if (!route) {
          setNotice(`Lokasi tidak ditemukan di OpenStreetMap: ${missing.join(', ')}`)
          return
        }
        const dests = destRef.current
        onChangeRef.current({
          destination: dests.filter(Boolean).join(' ➔ '),
          destinations: dests,
          distance_km: route.km,
          estimated_duration_minutes: route.minutes,
        })
        setNotice(
          `Rute PP: PT. JAI ➔ ${names.join(' ➔ ')} ➔ PT. JAI (${route.km} KM · ~${route.minutes} mnt)` +
            (route.approximate ? ' · perkiraan garis lurus (server rute OSRM tidak tersedia)' : '') +
            (missing.length ? ` · tidak ditemukan: ${missing.join(', ')}` : '')
        )
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setNotice('Gagal menghitung rute. Coba lagi.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCalculating(false)
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedKey])

  const emit = (next: string[], keepCalc = true) =>
    onChange({
      destination: next.filter(Boolean).join(' ➔ '),
      destinations: next,
      distance_km: keepCalc ? distanceKm : undefined,
      estimated_duration_minutes: keepCalc ? durationMins : undefined,
    })

  const handleUpdateDest = (idx: number, v: string) => {
    const next = [...destinations]
    next[idx] = v
    emit(next)
  }

  const handleSelect = (idx: number, place: GeoPlace) => {
    rememberPlace(place.label, place) // simpan koordinat agar tidak geocode ulang
    const next = [...destinations]
    next[idx] = place.label
    emit(next)
    setCommitted(next)
    setSuggestions([])
    setActiveIdx(null)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setActiveIdx(null)
      setSuggestions([])
      const cur = destRef.current
      if (cur.filter((d) => d.trim()).join('|') !== committedKey) setCommitted(cur)
    }, 180)
  }

  const handleAdd = () => emit([...destinations, ''])

  const handleRemove = (idx: number) => {
    if (destinations.length <= 1) return
    const next = destinations.filter((_, i) => i !== idx)
    emit(next)
    setCommitted(next)
  }

  return (
    <div className="space-y-3">
      {/* Titik Awal (terkunci) */}
      <div className="flex items-center justify-between rounded-xl border border-[#a3e635]/30 bg-[#062417] p-2.5 text-xs text-[#dff5e9]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16]">
            <Navigation size={13} className="rotate-45" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#bef264]">Titik Awal (Berangkat)</span>
              <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 text-[9px] font-semibold text-[#8fa99b]">
                <Lock size={9} /> Terkunci
              </span>
            </div>
            <p className="truncate text-[12px] font-bold text-white">{FACTORY_ORIGIN.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#a3e635]/15 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">Start Point</span>
      </div>

      {/* Daftar tujuan multi-drop */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#8fa99b]">Daftar Tujuan Multi-Drop ({destinations.length} Lokasi)</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a3e635] transition hover:text-[#bef264]"
          >
            <Plus size={13} /> Tambah Destinasi
          </button>
        </div>

        {destinations.map((dest, idx) => (
          <div key={idx} className="relative flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-[#bef264]">
              {idx + 1}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={dest}
                autoComplete="off"
                onFocus={() => setActiveIdx(idx)}
                onChange={(e) => {
                  setActiveIdx(idx)
                  handleUpdateDest(idx, e.target.value)
                }}
                onBlur={handleBlur}
                placeholder={`Destinasi ${idx + 1}: ketik nama tempat / alamat (OpenStreetMap)`}
                className={`${inputCls} pr-8`}
                required={idx === 0}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8fa99b]">
                {(calculating && idx === 0) || (searching && activeIdx === idx) ? (
                  <Loader2 size={14} className="animate-spin text-[#a3e635]" />
                ) : (
                  <MapPin size={14} />
                )}
              </div>

              {activeIdx === idx && (suggestions.length > 0 || searchError) && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-[#a3e635]/30 bg-[#0b2218] py-1 shadow-xl">
                  {searchError && <li className="px-3 py-2 text-[11px] text-amber-400">Pencarian lokasi gagal. Coba lagi.</li>}
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat}-${s.lng}-${i}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelect(idx, s)
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] text-[#dff5e9] hover:bg-[#a3e635]/10"
                      >
                        <MapPin size={12} className="mt-0.5 shrink-0 text-[#a3e635]" />
                        <span>{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {destinations.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title="Hapus destinasi ini"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Titik Akhir (terkunci) */}
      <div className="flex items-center justify-between rounded-xl border border-[#a3e635]/30 bg-[#062417] p-2.5 text-xs text-[#dff5e9]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16]">
            <RotateCcw size={13} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#bef264]">Titik Akhir (Pulang)</span>
              <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 text-[9px] font-semibold text-[#8fa99b]">
                <Lock size={9} /> Terkunci
              </span>
            </div>
            <p className="truncate text-[12px] font-bold text-white">{FACTORY_ORIGIN.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#a3e635]/15 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">Return Point</span>
      </div>

      {/* Peta Rute (Leaflet + OSM + OSRM) */}
      {mapData && mapData.places.length > 0 && (
        <RouteMap points={[ORIGIN_POINT, ...mapData.places]} line={mapData.route?.line ?? []} height={300} />
      )}

      {/* Jarak & waktu */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[#8fa99b]">
            Total Jarak Rute (KM) <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Compass size={14} className="text-[#a3e635]" />
              {distanceKm !== undefined ? `${distanceKm} KM` : '— KM'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">PP JAI</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[#8fa99b]">
            Estimasi Waktu Tempuh <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Clock size={14} className="text-[#a3e635]" />
              {durationMins !== undefined ? `${durationMins} Menit` : '— Menit'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">PP JAI</span>
          </div>
        </div>
      </div>

      {notice && (
        <p className="flex items-center gap-1.5 rounded-lg border border-[#a3e635]/20 bg-[#a3e635]/10 p-2 text-[10px] text-[#a3e635]">
          <span className="size-1.5 shrink-0 rounded-full bg-[#a3e635]" />
          <span>{notice}</span>
        </p>
      )}
    </div>
  )
}
