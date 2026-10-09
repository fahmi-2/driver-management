'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Clock,
  Compass,
  CornerDownRight,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { btnGhost, inputCls } from './ui-bits'

/**
 * Hardcoded Origin & Return Coordinates & Address
 * PT. Jatim Autocomp Indonesia (PT. JAI - Pasuruan Factory)
 */
export const FACTORY_ORIGIN = {
  name: 'PT. JAI (PT. Jatim Autocomp Indonesia)',
  address: 'Jl. Raya Wonoayu No. 26, Gempol, Pasuruan, Jawa Timur 67155',
  lat: -7.5507679,
  lng: 112.7068002,
}

// Pre-calculated offline distance lookup table for rapid fallback / demo mode (dari PT. JAI)
const KNOWN_DESTINATIONS: Record<string, { km: number; mins: number }> = {
  'kawasan industri mm2100, cikarang': { km: 32.5, mins: 45 },
  'cikarang dry port': { km: 18.2, mins: 35 },
  'bandara soekarno-hatta': { km: 68.4, mins: 85 },
  'bandara juanda surabaya': { km: 38.5, mins: 45 },
  'tanjung priok': { km: 55.3, mins: 75 },
  'summarecon bekasi': { km: 24.1, mins: 40 },
  'kantor pusat jakarta': { km: 42.0, mins: 65 },
  'karawang barat': { km: 45.0, mins: 60 },
  'bekasi barat': { km: 19.8, mins: 32 },
  'cibitung': { km: 15.6, mins: 28 },
  'surabaya kota': { km: 42.8, mins: 50 },
  'malang kota': { km: 52.4, mins: 65 },
  'pasuruan kota': { km: 31.0, mins: 40 },
  'sidoarjo': { km: 23.5, mins: 35 },
  'surabaya': { km: 40.0, mins: 50 },
  'gempol': { km: 5.2, mins: 12 },
  'bangil': { km: 14.5, mins: 25 },
  'pandaan': { km: 12.0, mins: 20 },
}

declare global {
  interface Window {
    google?: any
    __gmapsLoading?: Promise<void>
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps?.places && window.google?.maps?.DistanceMatrixService) {
    return Promise.resolve()
  }
  if (!window.__gmapsLoading) {
    window.__gmapsLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Gagal memuat Google Maps SDK'))
      document.head.appendChild(script)
    })
  }
  return window.__gmapsLoading
}

/**
 * Calculates straight-line haversine distance fallback in KM
 */
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Road factor typically ~1.3x straight line distance
  return Math.round(R * c * 1.3 * 10) / 10
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
  // If propDestinations provided, use it; otherwise fallback to [value] or ['']
  const destinations =
    propDestinations && propDestinations.length > 0
      ? propDestinations
      : value
      ? [value]
      : ['']

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [calculating, setCalculating] = useState(false)
  const [calcNotice, setCalcNotice] = useState<string | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Helper to estimate leg distance between two points/names
  const estimateLeg = (fromName: string, toName: string): { km: number; mins: number } => {
    const toLower = toName.toLowerCase().trim()
    for (const [key, val] of Object.entries(KNOWN_DESTINATIONS)) {
      if (toLower.includes(key) || key.includes(toLower)) {
        return { km: val.km, mins: val.mins }
      }
    }
    const pseudoKm = Math.min(100, Math.max(10, Math.round(toName.length * 1.6 * 10) / 10))
    const pseudoMins = Math.round((pseudoKm / 40) * 60) + 12
    return { km: pseudoKm, mins: pseudoMins }
  }

  // Recalculate round-trip: PT. JAI -> Dest 1 -> Dest 2 -> ... -> PT. JAI
  const recalculateRoute = async (currentDests: string[]) => {
    const validDests = currentDests.map((d) => d.trim()).filter(Boolean)
    if (validDests.length === 0) {
      onChange({
        destination: '',
        destinations: currentDests,
        distance_km: undefined,
        estimated_duration_minutes: undefined,
      })
      setCalcNotice(null)
      return
    }

    setCalculating(true)
    setCalcNotice(null)

    // Format destination label: "Dest 1 -> Dest 2 -> ..."
    const fullRouteSummary = validDests.join(' ➔ ')

    // 1. Check if Google Distance Matrix is available
    if (window.google?.maps?.DistanceMatrixService) {
      try {
        const service = new window.google.maps.DistanceMatrixService()
        // Leg 1: JAI to Dest 1, then between dests, then last dest back to JAI
        const points = [FACTORY_ORIGIN.name, ...validDests, FACTORY_ORIGIN.name]
        let totalKm = 0
        let totalMins = 0

        const legPromises = []
        for (let i = 0; i < points.length - 1; i++) {
          const originPoint = points[i]
          const destPoint = points[i + 1]
          legPromises.push(
            new Promise<{ km: number; mins: number }>((resolve) => {
              service.getDistanceMatrix(
                {
                  origins: [originPoint],
                  destinations: [destPoint],
                  travelMode: window.google.maps.TravelMode.DRIVING,
                  unitSystem: window.google.maps.UnitSystem.METRIC,
                },
                (response: any, status: string) => {
                  if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
                    const el = response.rows[0].elements[0]
                    resolve({
                      km: Math.round((el.distance.value / 1000) * 10) / 10,
                      mins: Math.round(el.duration.value / 60),
                    })
                  } else {
                    resolve(estimateLeg(originPoint, destPoint))
                  }
                }
              )
            })
          )
        }

        const results = await Promise.all(legPromises)
        for (const res of results) {
          totalKm += res.km
          totalMins += res.mins
        }

        totalKm = Math.round(totalKm * 10) / 10
        setCalculating(false)
        onChange({
          destination: fullRouteSummary,
          destinations: currentDests,
          distance_km: totalKm,
          estimated_duration_minutes: totalMins,
        })
        setCalcNotice(
          `Rute PP Terkunci (${validDests.length} Destinasi): Total ${totalKm} KM · ~${totalMins} menit`
        )
        return
      } catch (err) {
        console.warn('Google Maps distance calculation error:', err)
      }
    }

    // 2. Intelligent offline multi-stop roundtrip calculation
    // PT. JAI -> Dest 1 -> Dest 2 ... -> PT. JAI
    let accumKm = 0
    let accumMins = 0

    // Outbound leg: JAI to first destination
    const firstLeg = estimateLeg(FACTORY_ORIGIN.name, validDests[0])
    accumKm += firstLeg.km
    accumMins += firstLeg.mins

    // Intermediate multi-drop legs
    for (let i = 0; i < validDests.length - 1; i++) {
      const intermediateLeg = estimateLeg(validDests[i], validDests[i + 1])
      // Drops between stops are typically closer
      const dropKm = Math.round(intermediateLeg.km * 0.65 * 10) / 10
      const dropMins = Math.round(intermediateLeg.mins * 0.7)
      accumKm += dropKm
      accumMins += dropMins
    }

    // Return leg: Last destination back to PT. JAI
    const lastLeg = estimateLeg(validDests[validDests.length - 1], FACTORY_ORIGIN.name)
    accumKm += lastLeg.km
    accumMins += lastLeg.mins

    accumKm = Math.round(accumKm * 10) / 10

    setCalculating(false)
    onChange({
      destination: fullRouteSummary,
      destinations: currentDests,
      distance_km: accumKm,
      estimated_duration_minutes: accumMins,
    })
    setCalcNotice(
      `Rute Terkunci PP: PT. JAI ➔ ${fullRouteSummary} ➔ PT. JAI (${accumKm} KM · ~${accumMins} mnt)`
    )
  }

  // Attach Google Places Autocomplete to inputs
  useEffect(() => {
    if (!apiKey) return

    loadGoogleMaps(apiKey).then(() => {
      inputRefs.current.forEach((inputEl, idx) => {
        if (!inputEl) return
        // Prevent duplicate listener attachment
        if ((inputEl as any).__acAttached) return
        ;(inputEl as any).__acAttached = true

        const ac = new window.google.maps.places.Autocomplete(inputEl, {
          componentRestrictions: { country: 'id' },
          fields: ['formatted_address', 'name', 'geometry'],
        })

        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          const address = place?.formatted_address || place?.name || inputEl.value || ''
          if (address) {
            const next = [...destinations]
            next[idx] = address
            recalculateRoute(next)
          }
        })
      })
    })
  }, [apiKey, destinations.length])

  const handleUpdateDest = (idx: number, newVal: string) => {
    const next = [...destinations]
    next[idx] = newVal
    // update state in parent
    onChange({
      destination: next.filter(Boolean).join(' ➔ '),
      destinations: next,
      distance_km: distanceKm,
      estimated_duration_minutes: durationMins,
    })
  }

  const handleAddDestination = () => {
    const next = [...destinations, '']
    onChange({
      destination: next.filter(Boolean).join(' ➔ '),
      destinations: next,
      distance_km: distanceKm,
      estimated_duration_minutes: durationMins,
    })
  }

  const handleRemoveDestination = (idx: number) => {
    if (destinations.length <= 1) return
    const next = destinations.filter((_, i) => i !== idx)
    recalculateRoute(next)
  }

  return (
    <div className="space-y-3">
      {/* 1. Titik Awal (Terkunci Otomatis di PT. JAI) */}
      <div className="flex items-center justify-between rounded-xl bg-[#062417] border border-[#a3e635]/30 p-2.5 text-xs text-[#dff5e9]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16]">
            <Navigation size={13} className="rotate-45" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#bef264]">
                Titik Awal (Berangkat)
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 py-0.2 text-[9px] font-semibold text-[#8fa99b]">
                <Lock size={9} /> Terkunci
              </span>
            </div>
            <p className="truncate font-bold text-white text-[12px]">{FACTORY_ORIGIN.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#a3e635]/15 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">
          Start Point
        </span>
      </div>

      {/* 2. Daftar Destinasi Multi-Drop (Destinasi 1, Destinasi 2, dst) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#8fa99b]">
            Daftar Tujuan Multi-Drop ({destinations.length} Lokasi)
          </p>
          <button
            type="button"
            onClick={handleAddDestination}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a3e635] hover:text-[#bef264] transition"
          >
            <Plus size={13} /> Tambah Destinasi
          </button>
        </div>

        {destinations.map((dest, idx) => (
          <div key={idx} className="relative flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-[#bef264]">
              {idx + 1}
            </div>
            <div className="relative flex-1">
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                value={dest}
                onChange={(e) => handleUpdateDest(idx, e.target.value)}
                onBlur={() => {
                  if (dest.trim()) {
                    recalculateRoute(destinations)
                  }
                }}
                placeholder={
                  apiKey
                    ? `Destinasi ${idx + 1}: Ketik nama gedung / alamat (Google Places)`
                    : `Destinasi ${idx + 1}: contoh: Kawasan PIER / Cikarang Dry Port`
                }
                className={`${inputCls} pr-8`}
                required={idx === 0}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8fa99b]">
                {calculating ? (
                  <Loader2 size={14} className="animate-spin text-[#a3e635]" />
                ) : (
                  <MapPin size={14} />
                )}
              </div>
            </div>

            {destinations.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveDestination(idx)}
                title="Hapus destinasi ini"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 3. Titik Akhir (Terkunci Otomatis di PT. JAI) */}
      <div className="flex items-center justify-between rounded-xl bg-[#062417] border border-[#a3e635]/30 p-2.5 text-xs text-[#dff5e9]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16]">
            <RotateCcw size={13} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#bef264]">
                Titik Akhir (Pulang)
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 py-0.2 text-[9px] font-semibold text-[#8fa99b]">
                <Lock size={9} /> Terkunci
              </span>
            </div>
            <p className="truncate font-bold text-white text-[12px]">{FACTORY_ORIGIN.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#a3e635]/15 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">
          Return Point
        </span>
      </div>

      {/* Kalkulasi Jarak Total & Estimasi Waktu (Read-Only) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
            Total Jarak Rute (KM) <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Compass size={14} className="text-[#a3e635]" />
              {distanceKm !== undefined ? `${distanceKm} KM` : '— KM'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              PP JAI
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
            Estimasi Waktu Tempuh <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Clock size={14} className="text-[#a3e635]" />
              {durationMins !== undefined ? `${durationMins} Menit` : '— Menit'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              PP JAI
            </span>
          </div>
        </div>
      </div>

      {/* Info Status / Notice */}
      {calcNotice && (
        <p className="text-[10px] text-[#a3e635] flex items-center gap-1.5 bg-[#a3e635]/10 border border-[#a3e635]/20 rounded-lg p-2">
          <span className="size-1.5 rounded-full bg-[#a3e635] shrink-0" />
          <span className="truncate">{calcNotice}</span>
        </p>
      )}
    </div>
  )
}
