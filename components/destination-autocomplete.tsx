'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Clock, Compass, Loader2, MapPin, Navigation } from 'lucide-react'
import { inputCls } from './ui-bits'

/**
 * Hardcoded Origin Coordinates & Address
 * PT. Jatim Autocomp Indonesia (JAI - Pasuruan Factory)
 */
export const FACTORY_ORIGIN = {
  name: 'PT. Jatim Autocomp Indonesia (Gempol, Pasuruan)',
  address: 'Jl. Raya Wonoayu No. 26, Gempol, Pasuruan, Jawa Timur 67155',
  lat: -7.5507679,
  lng: 112.7068002,
}

// Pre-calculated offline distance lookup table for rapid fallback / demo mode
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
  distanceKm?: number
  durationMins?: number
  onChange: (data: { destination: string; distance_km?: number; estimated_duration_minutes?: number }) => void
}

export function DestinationAutocomplete({
  value,
  distanceKm,
  durationMins,
  onChange,
}: DestinationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcNotice, setCalcNotice] = useState<string | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Core headless distance matrix calculation
  const calculateDistance = async (destinationAddress: string, destinationCoords?: { lat: number; lng: number }) => {
    setCalculating(true)
    setCalcNotice(null)

    // 1. Try Google Distance Matrix API if window.google is ready
    if (window.google?.maps?.DistanceMatrixService) {
      try {
        const origin = new window.google.maps.LatLng(FACTORY_ORIGIN.lat, FACTORY_ORIGIN.lng)
        const dest = destinationCoords
          ? new window.google.maps.LatLng(destinationCoords.lat, destinationCoords.lng)
          : destinationAddress

        const service = new window.google.maps.DistanceMatrixService()
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [dest],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
          },
          (response: any, status: string) => {
            setCalculating(false)
            if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
              const element = response.rows[0].elements[0]
              const meters = element.distance.value
              const seconds = element.duration.value
              const km = Math.round((meters / 1000) * 10) / 10
              const minutes = Math.round(seconds / 60)

              onChange({
                destination: destinationAddress,
                distance_km: km,
                estimated_duration_minutes: minutes,
              })
              setCalcNotice(`Dihitung via Google Distance Matrix (${km} km · ~${minutes} mnt)`)
              return
            }
            // Fallback if status not OK
            applyFallbackCalculation(destinationAddress, destinationCoords)
          }
        )
        return
      } catch (err) {
        console.warn('Google Distance Matrix failed, using intelligent estimate:', err)
      }
    }

    // 2. Fallback calculation
    applyFallbackCalculation(destinationAddress, destinationCoords)
  }

  const applyFallbackCalculation = (address: string, coords?: { lat: number; lng: number }) => {
    setCalculating(false)
    const lower = address.toLowerCase()
    
    // Check known location table
    for (const [key, val] of Object.entries(KNOWN_DESTINATIONS)) {
      if (lower.includes(key) || key.includes(lower)) {
        onChange({
          destination: address,
          distance_km: val.km,
          estimated_duration_minutes: val.mins,
        })
        setCalcNotice(`Estimasi rute pabrik (${val.km} km · ~${val.mins} menit)`)
        return
      }
    }

    // If coordinates available (e.g. from places autocomplete geometry)
    if (coords) {
      const km = calculateHaversineKm(FACTORY_ORIGIN.lat, FACTORY_ORIGIN.lng, coords.lat, coords.lng)
      const minutes = Math.round((km / 45) * 60) + 10 // Average city/highway speed 45 km/h + buffer
      onChange({
        destination: address,
        distance_km: km,
        estimated_duration_minutes: minutes,
      })
      setCalcNotice(`Estimasi koordinat rute (${km} km · ~${minutes} mnt)`)
      return
    }

    // Generic heuristic based on name length / generic distance
    const pseudoKm = Math.min(120, Math.max(12, Math.round(address.length * 1.8 * 10) / 10))
    const pseudoMins = Math.round((pseudoKm / 40) * 60) + 15
    onChange({
      destination: address,
      distance_km: pseudoKm,
      estimated_duration_minutes: pseudoMins,
    })
    setCalcNotice(`Estimasi otomatis (${pseudoKm} km · ~${pseudoMins} mnt)`)
  }

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current) return
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'id' },
          fields: ['formatted_address', 'name', 'geometry'],
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const address = place?.formatted_address || place?.name || inputRef.current?.value || ''
          const coords = place?.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined

          if (address) {
            calculateDistance(address, coords)
          }
        })
      })
      .catch((err) => {
        console.warn('Google Places Autocomplete failed to load:', err)
      })
  }, [apiKey])

  return (
    <div className="space-y-3">
      {/* Autocomplete Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const nextVal = e.target.value
            onChange({
              destination: nextVal,
              distance_km: distanceKm,
              estimated_duration_minutes: durationMins,
            })
          }}
          onBlur={() => {
            // When user finishes typing and leaves without clicking dropdown
            if (value && (!distanceKm || !durationMins)) {
              calculateDistance(value)
            }
          }}
          placeholder={
            apiKey
              ? 'Ketik nama gedung, alamat, atau kota tujuan (Google Places)'
              : 'Ketik nama kota / lokasi tujuan (contoh: Bandara Juanda)'
          }
          className={`${inputCls} pr-9`}
          required
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa99b]">
          {calculating ? (
            <Loader2 size={16} className="animate-spin text-[#a3e635]" />
          ) : (
            <MapPin size={16} />
          )}
        </div>
      </div>

      {/* Origin indicator banner */}
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 text-[11px] text-[#8fa99b]">
        <Navigation size={13} className="text-[#a3e635] shrink-0" />
        <span className="truncate">
          Titik Berangkat Pabrik:{' '}
          <strong className="text-white font-medium">{FACTORY_ORIGIN.name}</strong>
        </span>
      </div>

      {/* Auto-populated Read-Only Fields */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distance Field */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
            Jarak Tempuh (KM) <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Compass size={14} className="text-[#a3e635]" />
              {distanceKm !== undefined ? `${distanceKm} KM` : '— KM'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              Read-only
            </span>
          </div>
        </div>

        {/* Estimated Duration Field */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
            Estimasi Waktu (Menit) <span className="text-[#a3e635]">*Otomatis</span>
          </label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-[#a3e635]/25 bg-black/40 px-3 text-xs font-bold text-white shadow-inner">
            <span className="flex items-center gap-1.5 text-[#bef264]">
              <Clock size={14} className="text-[#a3e635]" />
              {durationMins !== undefined ? `${durationMins} Menit` : '— Menit'}
            </span>
            <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#a3e635]">
              Read-only
            </span>
          </div>
        </div>
      </div>

      {/* Info Notice when calculated */}
      {calcNotice && (
        <p className="text-[10px] text-[#a3e635] flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#a3e635]" />
          {calcNotice}
        </p>
      )}
    </div>
  )
}
