'use client'

import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPoint = { lat: number; lng: number; label: string }

// divIcon agar tidak bergantung pada file gambar marker bawaan Leaflet (bermasalah di bundler)
const pin = (text: string, bg: string, fg: string) =>
  L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:${bg};color:${fg};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:700 12px system-ui">${text}</div>`,
  })

function FitBounds({ points, line }: { points: MapPoint[]; line: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    // container bisa tersembunyi/berubah ukuran saat mount
    const t = setTimeout(() => {
      map.invalidateSize()
      const pts: [number, number][] = line.length > 1 ? line : points.map((p) => [p.lat, p.lng])
      if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 15 })
    }, 80)
    return () => clearTimeout(t)
  }, [map, points, line])
  return null
}

export default function RouteMapInner({
  points,
  line,
  height = 280,
}: {
  points: MapPoint[]
  line: [number, number][]
  height?: number
}) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [-7.55, 112.7]
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-[#a3e635]/25">
      <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />}
        {points.map((p, i) => (
          <Marker
            key={`${i}-${p.lat}-${p.lng}`}
            position={[p.lat, p.lng]}
            icon={i === 0 ? pin('★', '#a3e635', '#052e16') : pin(String(i), '#2563eb', '#fff')}
          >
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
        <FitBounds points={points} line={line} />
      </MapContainer>
    </div>
  )
}
