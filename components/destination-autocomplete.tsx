'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Clock, Compass, Loader2, MapPin, Navigation, Plus, RotateCcw, Trash2, ArrowRight } from 'lucide-react'
import { inputCls } from './ui-bits'
import { RouteMap } from './route-map'
import {
  ORIGIN_POINT,
  isJaiLocation,
  rememberPlace,
  routeForCustomRoute,
  searchPlaces,
  type GeoPlace,
  type RouteResult,
} from '@/lib/geo'

/** Titik referensi default pabrik: PT. JAI Pasuruan */
export const FACTORY_ORIGIN = {
  name: 'PT. JAI',
  fullName: ORIGIN_POINT.label,
  address: 'Jl. Raya Wonoayu No. 26, Gempol, Pasuruan, Jawa Timur 67155',
  lat: ORIGIN_POINT.lat,
  lng: ORIGIN_POINT.lng,
}

interface DestinationAutocompleteProps {
  origin?: string
  value: string
  destinations?: string[]
  distanceKm?: number
  durationMins?: number
  returnToOrigin?: boolean
  onChange: (data: {
    origin: string
    destination: string
    destinations: string[]
    distance_km?: number
    estimated_duration_minutes?: number
    returnToOrigin?: boolean
  }) => void
}

export function DestinationAutocomplete({
  origin: propOrigin = 'PT. JAI',
  value,
  destinations: propDestinations,
  distanceKm,
  durationMins,
  returnToOrigin: propReturn = true,
  onChange,
}: DestinationAutocompleteProps) {
  const [origin, setOrigin] = useState(propOrigin || 'PT. JAI')
  const [returnToOrigin, setReturnToOrigin] = useState(propReturn)

  // Sinkronkan propOrigin jika berubah dari luar
  useEffect(() => {
    if (propOrigin && propOrigin !== origin) {
      setOrigin(propOrigin)
    }
  }, [propOrigin])

  const destinations = propDestinations && propDestinations.length > 0 ? propDestinations : value ? [value] : ['']

  const originRef = useRef(origin)
  originRef.current = origin

  const destRef = useRef(destinations)
  destRef.current = destinations

  const returnRef = useRef(returnToOrigin)
  returnRef.current = returnToOrigin

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Active autocomplete focus: 'origin' or number index of destination
  const [activeTarget, setActiveTarget] = useState<'origin' | number | null>(null)
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const [committedOrigin, setCommittedOrigin] = useState<string>(origin)
  const [committedDests, setCommittedDests] = useState<string[]>(destinations)
  const [calculating, setCalculating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mapData, setMapData] = useState<{ places: GeoPlace[]; route: RouteResult | null } | null>(null)

  // ---- Autocomplete (Nominatim) dengan debounce 500ms ----
  useEffect(() => {
    if (activeTarget === null) return
    const q = (activeTarget === 'origin' ? origin : destinations[activeTarget] || '').trim()
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
    }, 500)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTarget, activeTarget === 'origin' ? origin : activeTarget !== null ? destinations[activeTarget] : ''])

  // ---- Hitung rute (geocode + OSRM) setiap rute "dikunci" ----
  const committedKey = `${committedOrigin}|${committedDests.map((d) => d.trim()).filter(Boolean).join('|')}|${returnToOrigin}`
  useEffect(() => {
    const validDests = committedDests.map((d) => d.trim()).filter(Boolean)
    const validOrigin = committedOrigin.trim() || 'PT. JAI'

    if (validDests.length === 0) {
      setMapData(null)
      setNotice(null)
      return
    }

    const ctrl = new AbortController()
    setCalculating(true)

    routeForCustomRoute(validOrigin, validDests, returnToOrigin, ctrl.signal)
      .then(({ originPlace, places, missing, route }) => {
        if (ctrl.signal.aborted) return

        const allMapPlaces = originPlace ? [originPlace, ...places] : places
        setMapData({ places: allMapPlaces, route })

        if (!route) {
          setNotice(`Lokasi tidak ditemukan di peta: ${missing.join(', ')}`)
          return
        }

        const curDests = destRef.current
        const destString = curDests.filter(Boolean).join(' ➔ ')

        onChangeRef.current({
          origin: originRef.current,
          destination: destString,
          destinations: curDests,
          distance_km: route.km,
          estimated_duration_minutes: route.minutes,
          returnToOrigin: returnRef.current,
        })

        const routeSummary = returnToOrigin
          ? `${validOrigin} ➔ ${validDests.join(' ➔ ')} ➔ ${validOrigin}`
          : `${validOrigin} ➔ ${validDests.join(' ➔ ')} (Drop-off)`

        setNotice(
          `Rute: ${routeSummary} (${route.km} KM · ~${route.minutes} mnt)` +
            (route.approximate ? ' · perkiraan garis lurus' : '') +
            (missing.length ? ` · tidak ditemukan: ${missing.join(', ')}` : '')
        )
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setNotice('Gagal menghitung rute peta. Silakan coba kembali.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCalculating(false)
      })

    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedKey])

  const emitChange = (nextOrigin: string, nextDests: string[], nextReturn: boolean, keepCalc = true) => {
    onChange({
      origin: nextOrigin,
      destination: nextDests.filter(Boolean).join(' ➔ '),
      destinations: nextDests,
      distance_km: keepCalc ? distanceKm : undefined,
      estimated_duration_minutes: keepCalc ? durationMins : undefined,
      returnToOrigin: nextReturn,
    })
  }

  const handleUpdateOrigin = (val: string) => {
    setOrigin(val)
    emitChange(val, destinations, returnToOrigin)
  }

  const handleSetJaiOrigin = () => {
    setOrigin('PT. JAI')
    setCommittedOrigin('PT. JAI')
    emitChange('PT. JAI', destinations, returnToOrigin)
    setActiveTarget(null)
  }

  const handleUpdateDest = (idx: number, v: string) => {
    const next = [...destinations]
    next[idx] = v
    emitChange(origin, next, returnToOrigin)
  }

  const handleSelectSuggestion = (place: GeoPlace) => {
    rememberPlace(place.label, place)
    if (activeTarget === 'origin') {
      setOrigin(place.label)
      setCommittedOrigin(place.label)
      emitChange(place.label, destinations, returnToOrigin)
    } else if (typeof activeTarget === 'number') {
      const next = [...destinations]
      next[activeTarget] = place.label
      emitChange(origin, next, returnToOrigin)
      setCommittedDests(next)
    }
    setSuggestions([])
    setActiveTarget(null)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setActiveTarget(null)
      setSuggestions([])
      setCommittedOrigin(originRef.current)
      setCommittedDests(destRef.current)
    }, 200)
  }

  const handleAddDest = () => emitChange(origin, [...destinations, ''], returnToOrigin)

  const handleRemoveDest = (idx: number) => {
    if (destinations.length <= 1) return
    const next = destinations.filter((_, i) => i !== idx)
    emitChange(origin, next, returnToOrigin)
    setCommittedDests(next)
  }

  const handleToggleReturn = (val: boolean) => {
    setReturnToOrigin(val)
    emitChange(origin, destinations, val)
  }

  return (
    <div className="space-y-3">
      {/* 1. Titik Awal (Origin) - Dinamis & Bebas Diisi */}
      <div className="rounded-xl border border-[#a3e635]/30 bg-[#062417] p-3 text-xs text-[#dff5e9] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16]">
              <Navigation size={13} className="rotate-45" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#bef264]">Titik Awal (Origin / Berangkat)</span>
              <p className="text-[10px] text-[#8fa99b]">Bisa dari PT. JAI atau lokasi penjemputan lain (e.g. Bandara, Hotel)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSetJaiOrigin}
            className={`rounded-md px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 ${
              isJaiLocation(origin)
                ? 'bg-[#a3e635] text-[#052e16]'
                : 'bg-white/10 text-[#bef264] hover:bg-white/20'
            }`}
          >
            {isJaiLocation(origin) && <Check size={11} />}
            Pakai PT. JAI
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={origin}
            autoComplete="off"
            onFocus={() => setActiveTarget('origin')}
            onChange={(e) => {
              setActiveTarget('origin')
              handleUpdateOrigin(e.target.value)
            }}
            onBlur={handleBlur}
            placeholder="Ketik titik awal (Contoh: PT. JAI, Bandara Juanda, Hotel Shangri-La, dll.)"
            className={`${inputCls} pr-8 font-semibold text-white bg-black/40 border-[#a3e635]/40`}
            required
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8fa99b]">
            {searching && activeTarget === 'origin' ? (
              <Loader2 size={14} className="animate-spin text-[#a3e635]" />
            ) : (
              <MapPin size={14} className="text-[#a3e635]" />
            )}
          </div>

          {activeTarget === 'origin' && (suggestions.length > 0 || searchError) && (
            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-[#a3e635]/30 bg-[#0b2218] py-1 shadow-2xl">
              {searchError && <li className="px-3 py-2 text-[11px] text-amber-400">Pencarian lokasi gagal. Coba lagi.</li>}
              {suggestions.map((s, i) => (
                <li key={`${s.lat}-${s.lng}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectSuggestion(s)
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] text-[#dff5e9] hover:bg-[#a3e635]/15 transition"
                  >
                    <MapPin size={12} className="mt-0.5 shrink-0 text-[#a3e635]" />
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 2. Daftar Destinasi / Titik Tujuan (Multi-Drop) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#8fa99b] flex items-center gap-1">
            <ArrowRight size={13} className="text-[#a3e635]" />
            Daftar Destinasi / Tujuan ({destinations.length} Lokasi)
          </p>
          <button
            type="button"
            onClick={handleAddDest}
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
                onFocus={() => setActiveTarget(idx)}
                onChange={(e) => {
                  setActiveTarget(idx)
                  handleUpdateDest(idx, e.target.value)
                }}
                onBlur={handleBlur}
                placeholder={`Destinasi ${idx + 1}: ketik nama tempat / alamat (e.g. Hotel, Bandara, Kantor)`}
                className={`${inputCls} pr-8`}
                required={idx === 0}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8fa99b]">
                {(calculating && idx === 0) || (searching && activeTarget === idx) ? (
                  <Loader2 size={14} className="animate-spin text-[#a3e635]" />
                ) : (
                  <MapPin size={14} />
                )}
              </div>

              {activeTarget === idx && (suggestions.length > 0 || searchError) && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-[#a3e635]/30 bg-[#0b2218] py-1 shadow-2xl">
                  {searchError && <li className="px-3 py-2 text-[11px] text-amber-400">Pencarian lokasi gagal. Coba lagi.</li>}
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat}-${s.lng}-${i}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelectSuggestion(s)
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] text-[#dff5e9] hover:bg-[#a3e635]/15 transition"
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
                onClick={() => handleRemoveDest(idx)}
                title="Hapus destinasi ini"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 3. Opsi Perjalanan: Pulang-Pergi (Return) vs Sekali Jalan (Drop-off) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">Alur Perjalanan Akhir:</span>
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => handleToggleReturn(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                returnToOrigin
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              <RotateCcw size={11} />
              Pulang-Pergi (PP)
            </button>
            <button
              type="button"
              onClick={() => handleToggleReturn(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                !returnToOrigin
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              <ArrowRight size={11} />
              Sekali Jalan (Drop-off)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8fa99b] bg-white/[0.03] p-2 rounded-lg">
          <RotateCcw size={13} className="text-[#a3e635] shrink-0" />
          <span>
            {returnToOrigin ? (
              <>Mobil akan kembali ke titik awal: <strong className="text-white">{origin || 'PT. JAI'}</strong></>
            ) : (
              <>Perjalanan berakhir di destinasi akhir: <strong className="text-white">{destinations[destinations.length - 1] || 'Tujuan Akhir'}</strong> (Driver/tamu tidak kembali ke titik awal)</>
            )}
          </span>
        </div>
      </div>

      {/* 4. Peta Rute Visual (Leaflet + OpenStreetMap + OSRM) */}
      {mapData && mapData.places.length > 0 && (
        <RouteMap points={mapData.places} line={mapData.route?.line ?? []} height={280} />
      )}

      {/* 5. Indikator Total Jarak & Waktu Tempuh Otomatis */}
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
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              {returnToOrigin ? 'PP' : 'Drop-off'}
            </span>
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
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              {returnToOrigin ? 'PP' : 'Drop-off'}
            </span>
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
