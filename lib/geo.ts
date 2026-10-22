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

/** Kamus koordinat offline cepat untuk kota, singkatan, dan tujuan populer di Jawa Timur & Indonesia */
export const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; label: string }> = {
  // Singkatan umum
  sby: { lat: -7.2575, lng: 112.7521, label: 'Surabaya, Jawa Timur' },
  sda: { lat: -7.4530, lng: 112.7180, label: 'Sidoarjo, Jawa Timur' },
  mlg: { lat: -7.9797, lng: 112.6304, label: 'Malang, Jawa Timur' },
  pas: { lat: -7.6453, lng: 112.9075, label: 'Pasuruan, Jawa Timur' },
  jkt: { lat: -6.2088, lng: 106.8456, label: 'DKI Jakarta' },

  // Kota & Kabupaten Utama
  surabaya: { lat: -7.2575, lng: 112.7521, label: 'Surabaya, Jawa Timur' },
  'surabaya pusat': { lat: -7.2575, lng: 112.7521, label: 'Surabaya Pusat, Jawa Timur' },
  'surabaya selatan': { lat: -7.3115, lng: 112.7314, label: 'Surabaya Selatan, Jawa Timur' },
  'surabaya timur': { lat: -7.2842, lng: 112.7845, label: 'Surabaya Timur, Jawa Timur' },
  'surabaya barat': { lat: -7.2721, lng: 112.6738, label: 'Surabaya Barat, Jawa Timur' },
  'surabaya utara': { lat: -7.2185, lng: 112.7381, label: 'Surabaya Utara, Jawa Timur' },
  sidoarjo: { lat: -7.4530, lng: 112.7180, label: 'Sidoarjo, Jawa Timur' },
  malang: { lat: -7.9797, lng: 112.6304, label: 'Malang, Jawa Timur' },
  'kota malang': { lat: -7.9797, lng: 112.6304, label: 'Kota Malang, Jawa Timur' },
  'kab malang': { lat: -8.1256, lng: 112.5695, label: 'Kabupaten Malang, Jawa Timur' },
  pasuruan: { lat: -7.6453, lng: 112.9075, label: 'Pasuruan, Jawa Timur' },
  'kota pasuruan': { lat: -7.6453, lng: 112.9075, label: 'Kota Pasuruan, Jawa Timur' },
  'kab pasuruan': { lat: -7.7121, lng: 112.8256, label: 'Kabupaten Pasuruan, Jawa Timur' },
  gempol: { lat: -7.5878, lng: 112.6974, label: 'Gempol, Pasuruan' },
  pandaan: { lat: -7.6534, lng: 112.6953, label: 'Pandaan, Pasuruan' },
  bangil: { lat: -7.5986, lng: 112.8021, label: 'Bangil, Pasuruan' },
  beji: { lat: -7.5947, lng: 112.7569, label: 'Beji, Pasuruan' },
  sukorejo: { lat: -7.7121, lng: 112.7163, label: 'Sukorejo, Pasuruan' },
  purwosari: { lat: -7.7554, lng: 112.7483, label: 'Purwosari, Pasuruan' },
  purwodadi: { lat: -7.7981, lng: 112.7350, label: 'Purwodadi, Pasuruan' },
  kejayan: { lat: -7.6989, lng: 112.8953, label: 'Kejayan, Pasuruan' },
  rembang: { lat: -7.6186, lng: 112.8361, label: 'Rembang, Pasuruan' },
  kraton: { lat: -7.6256, lng: 112.8722, label: 'Kraton, Pasuruan' },
  grati: { lat: -7.7117, lng: 113.0119, label: 'Grati, Pasuruan' },
  ngoro: { lat: -7.5750, lng: 112.6288, label: 'Ngoro Industrial Park, Mojokerto' },
  nip: { lat: -7.5750, lng: 112.6288, label: 'Ngoro Industrial Park, Mojokerto' },
  mojokerto: { lat: -7.4726, lng: 112.4381, label: 'Mojokerto, Jawa Timur' },
  'kota mojokerto': { lat: -7.4726, lng: 112.4381, label: 'Kota Mojokerto, Jawa Timur' },
  mojosari: { lat: -7.5147, lng: 112.5539, label: 'Mojosari, Mojokerto' },
  gresik: { lat: -7.1566, lng: 112.6555, label: 'Gresik, Jawa Timur' },
  driyorejo: { lat: -7.3622, lng: 112.6253, label: 'Driyorejo, Gresik' },
  manyar: { lat: -7.1122, lng: 112.5936, label: 'Manyar, Gresik' },
  krian: { lat: -7.4116, lng: 112.5807, label: 'Krian, Sidoarjo' },
  waru: { lat: -7.3533, lng: 112.7262, label: 'Waru, Sidoarjo' },
  gedangan: { lat: -7.3917, lng: 112.7239, label: 'Gedangan, Sidoarjo' },
  porong: { lat: -7.5372, lng: 112.6989, label: 'Porong, Sidoarjo' },
  tanggulangin: { lat: -7.4986, lng: 112.7183, label: 'Tanggulangin, Sidoarjo' },
  candi: { lat: -7.4750, lng: 112.7153, label: 'Candi, Sidoarjo' },
  sukodono: { lat: -7.4089, lng: 112.6781, label: 'Sukodono, Sidoarjo' },
  taman: { lat: -7.3639, lng: 112.6931, label: 'Taman, Sidoarjo' },
  sedati: { lat: -7.3889, lng: 112.7744, label: 'Sedati, Sidoarjo' },
  juanda: { lat: -7.3797, lng: 112.7877, label: 'Bandara Internasional Juanda, Sidoarjo' },
  'bandara juanda': { lat: -7.3797, lng: 112.7877, label: 'Bandara Internasional Juanda, Sidoarjo' },
  'airport juanda': { lat: -7.3797, lng: 112.7877, label: 'Bandara Internasional Juanda, Sidoarjo' },
  't1 juanda': { lat: -7.3797, lng: 112.7877, label: 'Terminal 1 Juanda, Sidoarjo' },
  't2 juanda': { lat: -7.3719, lng: 112.7667, label: 'Terminal 2 Juanda, Sidoarjo' },
  perak: { lat: -7.1991, lng: 112.7335, label: 'Pelabuhan Tanjung Perak, Surabaya' },
  'tanjung perak': { lat: -7.1991, lng: 112.7335, label: 'Pelabuhan Tanjung Perak, Surabaya' },
  'pelabuhan tanjung perak': { lat: -7.1991, lng: 112.7335, label: 'Pelabuhan Tanjung Perak, Surabaya' },
  rungkut: { lat: -7.3323, lng: 112.7597, label: 'Kawasan Industri SIER Rungkut, Surabaya' },
  sier: { lat: -7.3323, lng: 112.7597, label: 'Kawasan Industri SIER Rungkut, Surabaya' },
  'rungkut industri': { lat: -7.3323, lng: 112.7597, label: 'Kawasan Industri SIER Rungkut, Surabaya' },
  lawang: { lat: -7.8347, lng: 112.6961, label: 'Lawang, Malang' },
  singosari: { lat: -7.8924, lng: 112.6644, label: 'Singosari, Malang' },
  batu: { lat: -7.8700, lng: 112.5270, label: 'Kota Batu, Jawa Timur' },
  'kota batu': { lat: -7.8700, lng: 112.5270, label: 'Kota Batu, Jawa Timur' },
  probolinggo: { lat: -7.7543, lng: 113.2159, label: 'Probolinggo, Jawa Timur' },
  kraksaan: { lat: -7.7611, lng: 113.4181, label: 'Kraksaan, Probolinggo' },
  jombang: { lat: -7.5461, lng: 112.2331, label: 'Jombang, Jawa Timur' },
  ploso: { lat: -7.4528, lng: 112.2361, label: 'Ploso, Jombang' },
  nganjuk: { lat: -7.6047, lng: 111.9039, label: 'Nganjuk, Jawa Timur' },
  kertosono: { lat: -7.5892, lng: 112.0931, label: 'Kertosono, Nganjuk' },
  kediri: { lat: -7.8167, lng: 112.0167, label: 'Kediri, Jawa Timur' },
  blitar: { lat: -8.0983, lng: 112.1681, label: 'Blitar, Jawa Timur' },
  tuban: { lat: -6.8978, lng: 112.0644, label: 'Tuban, Jawa Timur' },
  lamongan: { lat: -7.1197, lng: 112.4158, label: 'Lamongan, Jawa Timur' },
  bangkalan: { lat: -7.0319, lng: 112.7481, label: 'Bangkalan, Madura' },
  suramadu: { lat: -7.1856, lng: 112.7789, label: 'Jembatan Suramadu, Surabaya' },
  'kantor pusat': { lat: -7.2575, lng: 112.7521, label: 'Kantor Pusat Surabaya' },
  papaya: { lat: -7.2917, lng: 112.7381, label: 'Papaya Fresh Gallery, Surabaya' },
  'papaya surabaya': { lat: -7.2917, lng: 112.7381, label: 'Papaya Fresh Gallery, Surabaya' },
  'surabaya papaya': { lat: -7.2917, lng: 112.7381, label: 'Papaya Fresh Gallery, Surabaya' },
  hoky: { lat: -7.2889, lng: 112.7439, label: 'Hoky Supermarket, Surabaya' },
  'hoky surabaya': { lat: -7.2889, lng: 112.7439, label: 'Hoky Supermarket, Surabaya' },
  'pasar atom': { lat: -7.2403, lng: 112.7442, label: 'Pasar Atom, Surabaya' },
  tunjungan: { lat: -7.2625, lng: 112.7397, label: 'Tunjungan Plaza, Surabaya' },
  'tunjungan plaza': { lat: -7.2625, lng: 112.7397, label: 'Tunjungan Plaza, Surabaya' },
  tp: { lat: -7.2625, lng: 112.7397, label: 'Tunjungan Plaza, Surabaya' },
  ptc: { lat: -7.2883, lng: 112.6756, label: 'Pakuwon Trade Center (PTC), Surabaya' },
  pakuwon: { lat: -7.2883, lng: 112.6756, label: 'Pakuwon Mall, Surabaya' },
  'galaxy mall': { lat: -7.2758, lng: 112.7806, label: 'Galaxy Mall, Surabaya' },
  gm: { lat: -7.2758, lng: 112.7806, label: 'Galaxy Mall, Surabaya' },
  'ciputra world': { lat: -7.2922, lng: 112.7183, label: 'Ciputra World Surabaya' },
  cw: { lat: -7.2922, lng: 112.7183, label: 'Ciputra World Surabaya' },
  'rsud soetomo': { lat: -7.2683, lng: 112.7583, label: 'RSUD Dr. Soetomo, Surabaya' },
  soetomo: { lat: -7.2683, lng: 112.7583, label: 'RSUD Dr. Soetomo, Surabaya' },
  'rsud bangil': { lat: -7.5961, lng: 112.8094, label: 'RSUD Bangil, Pasuruan' },
  jakarta: { lat: -6.2088, lng: 106.8456, label: 'DKI Jakarta' },
  semarang: { lat: -6.9667, lng: 110.4167, label: 'Semarang, Jawa Tengah' },
  solo: { lat: -7.5755, lng: 110.8243, label: 'Surakarta / Solo, Jawa Tengah' },
  surakarta: { lat: -7.5755, lng: 110.8243, label: 'Surakarta / Solo, Jawa Tengah' },
  jogja: { lat: -7.7956, lng: 110.3695, label: 'Yogyakarta, D.I. Yogyakarta' },
  yogyakarta: { lat: -7.7956, lng: 110.3695, label: 'Yogyakarta, D.I. Yogyakarta' },
}

/** Helper untuk menormalisasi format tujuan (apakah array, object JSON, atau teks) menjadi string[] aman */
export function normalizeDestinations(destinations?: any, destination?: string): string[] {
  let rawList: string[] = []
  if (Array.isArray(destinations)) {
    rawList = destinations
  } else if (destinations && typeof destinations === 'object' && Array.isArray((destinations as any).stops)) {
    rawList = (destinations as any).stops
  } else if (typeof destinations === 'string' && destinations.trim()) {
    rawList = destinations.split(/➔|,|->/)
  } else if (destination && typeof destination === 'string') {
    rawList = destination.split(/➔|,|->/)
  }

  return rawList
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
}

const geocodeCache = new Map<string, GeoPlace | null>()
const key = (s: string) => s.trim().toLowerCase()

export function rememberPlace(name: string, p: GeoPlace) {
  geocodeCache.set(key(name), p)
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Prioritas 1: Periksa kamus lokal
  const lk = key(q)
  if (KNOWN_LOCATIONS[lk]) {
    const loc = KNOWN_LOCATIONS[lk]
    return [{ label: loc.label, lat: loc.lat, lng: loc.lng }]
  }

  // Prioritas 2: Cari via Nominatim dengan fallback
  try {
    const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=5&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const data: any[] = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return data.map((d) => ({ label: d.display_name as string, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
    }
  } catch {
    // Abaikan jika network error / rate limit Nominatim
  }

  // Prioritas 3: Cek apakah mengandung kata kunci nama kota di kamus
  for (const [kw, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (lk.includes(kw) || kw.includes(lk)) {
      return [{ label: `${q} (${loc.label})`, lat: loc.lat, lng: loc.lng }]
    }
  }

  return []
}

/** Ambil koordinat dari nama lokasi (Kamus Cepat -> Cache -> Nominatim -> Fuzzy Fallback). */
export async function geocode(name: string): Promise<GeoPlace | null> {
  const k = key(name)
  if (!k) return null

  // 1. Cek kamus offline langsung
  if (KNOWN_LOCATIONS[k]) {
    const loc = KNOWN_LOCATIONS[k]
    const p: GeoPlace = { label: name, lat: loc.lat, lng: loc.lng }
    geocodeCache.set(k, p)
    return p
  }

  // 2. Cek memori cache
  if (geocodeCache.has(k)) return geocodeCache.get(k) ?? null

  // 3. Cek pencarian kata kunci offline (misal "surabaya papaya" -> "surabaya")
  for (const [kw, loc] of Object.entries(KNOWN_LOCATIONS)) {
    const reg = new RegExp(`\\b${kw}\\b`, 'i')
    if (reg.test(k) || (k.length > 3 && kw.includes(k))) {
      const p: GeoPlace = { label: name, lat: loc.lat, lng: loc.lng }
      geocodeCache.set(k, p)
      return p
    }
  }

  // 4. Coba search via Nominatim
  try {
    const results = await searchPlaces(name)
    if (results.length > 0) {
      const place = { ...results[0], label: name }
      geocodeCache.set(k, place)
      return place
    }
  } catch {
    // Abaikan error
  }

  // 5. Fallback aman terakhir: jika menyebutkan kota besar di Jawa Timur
  for (const [kw, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (k.includes(kw)) {
      const p: GeoPlace = { label: name, lat: loc.lat, lng: loc.lng }
      geocodeCache.set(k, p)
      return p
    }
  }

  return null
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

/** Rute berurutan melewati semua titik (mis. JAI -> tujuan... -> JAI).
 * Dihitung per leg (titik i -> titik i+1) dengan memilih opsi jarak terpendek (shortest distance)
 * agar rute antar destinasi langsung (seperti Malang -> Pujon/Kandangan -> Nganjuk)
 * dan tidak memutar balik ke tol dekat titik awal.
 */
export async function getRoute(points: LatLng[], signal?: AbortSignal): Promise<RouteResult> {
  if (points.length < 2) {
    return { km: 0, minutes: 0, line: [], approximate: false }
  }

  try {
    let totalDistance = 0
    let totalDuration = 0
    const fullLine: [number, number][] = []

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]
      const to = points[i + 1]
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
      const url = `${OSRM_URL}/route/v1/driving/${coords}?alternatives=true&overview=full&geometries=geojson`
      
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`OSRM ${res.status}`)
      const data = await res.json()
      
      const routes = data?.routes || []
      if (data.code !== 'Ok' || routes.length === 0) throw new Error('OSRM tidak menemukan rute')
      
      // Pilih rute dengan jarak tempuh terpendek (shortest distance)
      const sorted = [...routes].sort((a, b) => a.distance - b.distance)
      const best = sorted[0]

      totalDistance += best.distance
      totalDuration += best.duration

      const legCoords: [number, number][] = best.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      )

      if (i > 0 && legCoords.length > 0) {
        legCoords.shift() // Hindari duplikasi titik sambungan antar leg
      }
      fullLine.push(...legCoords)
    }

    return {
      km: Math.round((totalDistance / 1000) * 10) / 10,
      minutes: Math.round(totalDuration / 60),
      line: fullLine,
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

/** Cek apakah lokasi adalah PT. JAI (pabrik) */
export function isJaiLocation(location?: string): boolean {
  if (!location) return false
  const s = location.trim().toUpperCase()
  return (
    s === 'PT. JAI' ||
    s === 'PT JAI' ||
    s.includes('JATIM AUTOCOMP') ||
    s.includes('PT. JATIM AUTOCOMP') ||
    s.includes('PABRIK JAI') ||
    s.startsWith('PT. JAI') ||
    s.startsWith('PT JAI')
  )
}

/** Geocode semua tujuan lalu hitung rute pulang-pergi dari/ke PT. JAI (kompatibilitas lama). */
export async function routeForDestinations(destinations?: any, signal?: AbortSignal) {
  return routeForCustomRoute('PT. JAI', destinations, true, signal)
}

/** Geocode titik awal dinamis dan tujuan-tujuan, lalu hitung rute dinamis (bisa custom origin & custom destination). */
export async function routeForCustomRoute(
  origin: string,
  destinations?: any,
  returnToOrigin: boolean = false,
  signal?: AbortSignal
) {
  const originName = origin?.trim() || 'PT. JAI'
  let originPlace: GeoPlace | null = null

  if (isJaiLocation(originName)) {
    originPlace = ORIGIN_POINT
  } else {
    originPlace = await geocode(originName)
  }

  const names = normalizeDestinations(destinations)
  const places: GeoPlace[] = []
  const missing: string[] = []

  if (!originPlace) {
    missing.push(originName)
  }

  for (const n of names) {
    if (isJaiLocation(n)) {
      places.push({ ...ORIGIN_POINT, label: n })
      continue
    }
    const p = await geocode(n)
    if (p) places.push({ ...p, label: n })
    else missing.push(n)
  }

  // Jika geocode gagal semua tapi ada nama tujuan, sediakan titik estimasi agar peta tetap bisa dirender secara konsisten
  if (places.length === 0 && names.length > 0) {
    const fallbackPlace: GeoPlace = {
      label: `${names[0]} (Estimasi Koridor Jatim)`,
      lat: -7.3115,
      lng: 112.7314,
    }
    places.push(fallbackPlace)
  }

  if (!originPlace && places.length === 0) {
    return { originPlace, places, missing, route: null as RouteResult | null }
  }

  const routePoints: LatLng[] = []
  if (originPlace) routePoints.push(originPlace)
  routePoints.push(...places)
  if (returnToOrigin && originPlace && places.length > 0) {
    routePoints.push(originPlace)
  }

  if (routePoints.length < 2) {
    return { originPlace, places, missing, route: null as RouteResult | null }
  }

  const route = await getRoute(routePoints, signal)
  return { originPlace, places, missing, route }
}

