// Helper geospasial 100% open-source & gratis (tanpa API key):
//  - Pencarian lokasi : Nominatim (OpenStreetMap)
//  - Rute & jarak     : OSRM public demo server
// Catatan: server publik ini ditujukan untuk pemakaian ringan. Untuk trafik tinggi,
// host sendiri Nominatim/OSRM lalu ganti NOMINATIM_URL / OSRM_URL via env.

export type LatLng = { lat: number; lng: number }
export type GeoPlace = LatLng & { label: string }

const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
const OSRM_URL = process.env.NEXT_PUBLIC_OSRM_URL || 'https://router.project-osrm.org'

// Titik awal/akhir tetap: PT. JAI Pasuruan
export const ORIGIN_POINT: GeoPlace = {
  label: 'PT. JAI (PT. Jatim Autocomp Indonesia)',
  lat: -7.5507679,
  lng: 112.7068002,
}

const geocodeCache = new Map<string, GeoPlace | null>()
const key = (s: string) => s.trim().toLowerCase()

export function rememberPlace(name: string, p: GeoPlace) {
  geocodeCache.set(key(name), p)
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=5&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data: any[] = await res.json()
  return data.map((d) => ({ label: d.display_name as string, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
}

/** Ambil koordinat dari nama lokasi (cache -> Nominatim hasil teratas). */
export async function geocode(name: string): Promise<GeoPlace | null> {
  const k = key(name)
  if (!k) return null
  if (geocodeCache.has(k)) return geocodeCache.get(k) ?? null
  try {
    const [first] = await searchPlaces(name)
    const place = first ? { ...first, label: name } : null
    geocodeCache.set(k, place)
    return place
  } catch {
    return null
  }
}

export type RouteResult = {
  km: number
  minutes: number
  line: [number, number][] // [lat, lng]
  approximate: boolean // true jika OSRM gagal & memakai garis lurus
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Rute berurutan melewati semua titik (mis. JAI -> tujuan... -> JAI). */
export async function getRoute(points: LatLng[], signal?: AbortSignal): Promise<RouteResult> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  try {
    const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()
    const r = data?.routes?.[0]
    if (data.code !== 'Ok' || !r) throw new Error('OSRM tidak menemukan rute')
    return {
      km: Math.round((r.distance / 1000) * 10) / 10,
      minutes: Math.round(r.duration / 60),
      line: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
      approximate: false,
    }
  } catch (err) {
    if ((err as any)?.name === 'AbortError') throw err
    let km = 0
    for (let i = 0; i < points.length - 1; i++) km += haversineKm(points[i], points[i + 1])
    km = Math.round(km * 1.3 * 10) / 10 // faktor jalan raya
    return {
      km,
      minutes: Math.round((km / 40) * 60),
      line: points.map((p) => [p.lat, p.lng] as [number, number]),
      approximate: true,
    }
  }
}

/** Geocode semua tujuan lalu hitung rute pulang-pergi dari/ke PT. JAI. */
export async function routeForDestinations(destinations: string[], signal?: AbortSignal) {
  const names = destinations.map((d) => d.trim()).filter(Boolean)
  const places: GeoPlace[] = []
  const missing: string[] = []
  for (const n of names) {
    const p = await geocode(n)
    if (p) places.push({ ...p, label: n })
    else missing.push(n)
  }
  if (places.length === 0) return { places, missing, route: null as RouteResult | null }
  const route = await getRoute([ORIGIN_POINT, ...places, ORIGIN_POINT], signal)
  return { places, missing, route }
}
