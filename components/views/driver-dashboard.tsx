'use client'

import React, { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Account } from '@/lib/accounts'
import { Card, PageHeader, Pill } from '../ui-bits'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Navigation, 
  ShieldCheck 
} from 'lucide-react'

interface DriverDashboardProps {
  user: Account
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const { db } = useStore()

  // Match driver by username or name
  const matchedDriver = useMemo(() => {
    return db.drivers.find(
      d => d.name.toLowerCase() === user.name.toLowerCase() ||
           d.name.toLowerCase().includes(user.name.toLowerCase()) ||
           user.name.toLowerCase().includes(d.name.toLowerCase())
    ) || db.drivers[0]
  }, [db.drivers, user])

  // Trips assigned to this driver that have passed SPV Kendaraan ACC (READY, ON_TRIP, DONE)
  const driverTrips = useMemo(() => {
    if (!matchedDriver) return []
    return db.trips.filter(t => {
      // Must match driver
      const isMyTrip = t.driverId === matchedDriver.id
      // Must have passed ACC SPV Kendaraan (READY, ON_TRIP, or DONE). 
      const isApproved = ['READY', 'ON_TRIP', 'DONE'].includes(t.status)
      return isMyTrip && isApproved
    })
  }, [db.trips, matchedDriver])

  const upcomingTrips = useMemo(() => {
    return driverTrips.filter(t => t.status === 'READY')
  }, [driverTrips])

  const activeTrip = useMemo(() => {
    return driverTrips.find(t => t.status === 'ON_TRIP')
  }, [driverTrips])

  const completedTrips = useMemo(() => {
    return driverTrips.filter(t => t.status === 'DONE')
  }, [driverTrips])

  // Calculate driver personal metrics
  const totalKm = useMemo(() => {
    return driverTrips.reduce((acc, t) => acc + (t.distance_km || 0), 0)
  }, [driverTrips])

  const totalHours = useMemo(() => {
    const mins = driverTrips.reduce((acc, t) => acc + (t.durationMin || 60), 0)
    return (mins / 60).toFixed(1)
  }, [driverTrips])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Jadwal Tugas Driver" 
        desc={`Portal resmi penugasan armada yang telah disetujui SPV Kendaraan · ${user.name}`} 
      />

      {/* Top Banner Profile Driver */}
      <div className="relative overflow-hidden rounded-2xl border border-[#a3e635]/25 bg-gradient-to-r from-[#0a2f1d] via-[#051c11] to-[#051a10] p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Pill label="Akun Resmi Driver" tone="green" />
              <span className="font-mono text-[11px] text-[#8fa99b] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Mobil Default: {matchedDriver?.defaultPlate || 'B 1824 KQA'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Halo, {user.name} 👋
            </h2>
            <p className="text-xs text-[#8fa99b]">
              Berikut adalah daftar penugasan perjalanan dinas yang telah disetujui resmi oleh SPV Kendaraan.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
            <div className="text-center px-3">
              <div className="text-xl font-extrabold text-[#bef264]">{upcomingTrips.length}</div>
              <div className="text-[10px] text-[#8fa99b]">Siap Jalan</div>
            </div>
            <div className="text-center px-3 border-x border-white/10">
              <div className="text-xl font-extrabold text-amber-400">{activeTrip ? 1 : 0}</div>
              <div className="text-[10px] text-[#8fa99b]">Sedang Jalan</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xl font-extrabold text-sky-400">{completedTrips.length}</div>
              <div className="text-[10px] text-[#8fa99b]">Selesai</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Beban Kerja Driver Mandiri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-white/10 bg-white/[0.03]">
          <div className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] text-[#8fa99b] uppercase font-bold tracking-wider">Total Akumulasi Jarak Driver</div>
              <div className="text-2xl font-extrabold text-white">{totalKm} <span className="text-xs font-normal text-[#8fa99b]">KM</span></div>
              <div className="text-[11px] text-[#8fa99b] mt-0.5">Tercatat secara paralel pada profil pribadi driver</div>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/[0.03]">
          <div className="p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] text-[#8fa99b] uppercase font-bold tracking-wider">Total Durasi Operasional</div>
              <div className="text-2xl font-extrabold text-white">{totalHours} <span className="text-xs font-normal text-[#8fa99b]">Jam Kerja</span></div>
              <div className="text-[11px] text-[#8fa99b] mt-0.5">Termasuk waktu tunggu dan durasi perjalanan</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tugas Aktif Saat Ini */}
      {activeTrip && (
        <Card 
          title="Tugas Sedang Berjalan (ON TRIP)"
          subtitle="Kendaraan saat ini berada di luar gerbang pabrik"
          className="border border-amber-500/40 bg-amber-950/20"
        >
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-amber-500/30">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Pill label="DALAM PERJALANAN" tone="amber" />
                  <span className="text-xs text-[#8fa99b]">Kode Booking: <span className="font-mono text-white">{activeTrip.id}</span></span>
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-400 shrink-0" />
                  {activeTrip.destination}
                </div>
                <div className="text-xs text-[#8fa99b] flex flex-wrap items-center gap-4">
                  <span>🚗 {activeTrip.isOtherVehicle ? activeTrip.otherVehicleName || 'Mobil Luar' : activeTrip.plate}</span>
                  <span>⏰ Berangkat: {activeTrip.date}</span>
                  <span>👥 {activeTrip.driverOnly ? 'Hanya Driver (Kirim Barang/Dokumen)' : `${activeTrip.passengers?.length || 1} Penumpang`}</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-right shrink-0">
                <div className="text-[11px] text-amber-300 font-semibold">Status Kendaraan</div>
                <div className="text-xs text-white font-medium">Di Luar Pabrik</div>
                <div className="text-[10px] text-[#8fa99b] mt-0.5">Check-in kembali di Gerbang Security</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Daftar Tugas Siap Berangkat (Jadwal Setelah ACC SPV Kendaraan) */}
      <Card 
        title="Jadwal Siap Berangkat (Disetujui SPV Kendaraan)"
        subtitle="Hanya jadwal yang telah lolos verifikasi akhir SPV Kendaraan yang muncul di sini"
        className="border border-white/10 bg-white/[0.02]"
      >
        <div className="p-5">
          {upcomingTrips.length === 0 ? (
            <div className="text-center py-12 text-[#8fa99b] border border-dashed border-white/10 rounded-xl">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-[#8fa99b]/60" />
              <p className="font-semibold text-white">Belum ada jadwal penugasan baru yang siap.</p>
              <p className="text-xs text-[#8fa99b] mt-1">
                Jadwal akan muncul setelah Admin memasukkan penugasan dan disetujui resmi oleh SPV Kendaraan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingTrips.map(trip => (
                <div 
                  key={trip.id} 
                  className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4 hover:border-[#a3e635]/40 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Pill label="Siap Jalan (ACC SPV)" tone="green" />
                        {trip.driverOnly && (
                          <Pill label="Hanya Driver" tone="amber" />
                        )}
                        {trip.isOtherVehicle && (
                          <Pill label="Mobil Lain" tone="purple" />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mt-2 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#a3e635] shrink-0" />
                        {trip.destination}
                      </h3>
                    </div>

                    <div className="text-right text-xs text-[#8fa99b] font-mono">
                      {trip.id}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#cad6cf] bg-white/[0.03] p-3 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8fa99b]">Tanggal & Waktu:</span>
                      <span className="font-medium text-white">{trip.date} • {trip.estDeparture || '08:00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8fa99b]">Kendaraan Ditugaskan:</span>
                      <span className="font-bold text-[#bef264]">
                        {trip.isOtherVehicle ? trip.otherVehicleName || 'Mobil Luar' : trip.plate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8fa99b]">Pemohon / Dept:</span>
                      <span className="font-medium text-white">{trip.requesterName} ({trip.dept})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8fa99b]">Keperluan:</span>
                      <span className="font-medium text-white">{trip.guest || trip.category}</span>
                    </div>
                    {trip.adminNote && (
                      <div className="pt-2 border-t border-white/10 text-white">
                        <span className="text-[#8fa99b] font-semibold block mb-0.5 text-[11px]">Catatan Admin:</span>
                        <div className="bg-amber-500/10 p-2 rounded text-[11px] text-amber-200 border border-amber-500/20">
                          {trip.adminNote}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Penumpang list jika ada */}
                  {!trip.driverOnly && trip.passengers && trip.passengers.length > 0 && (
                    <div className="text-xs">
                      <span className="text-[#8fa99b] font-medium flex items-center gap-1 mb-1.5">
                        <Users className="h-3.5 w-3.5" /> Daftar Penumpang:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.passengers.map((p, idx) => (
                          <span key={idx} className="bg-white/5 text-white px-2 py-0.5 rounded text-[11px] border border-white/10">
                            {p.name} ({p.dept})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status alur keberangkatan dihandle oleh Security */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[11px] text-[#8fa99b]">
                    <span>Status Keberangkatan:</span>
                    <span className="font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Menunggu Gate Clearance Security
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Riwayat Selesai */}
      {completedTrips.length > 0 && (
        <Card 
          title="Riwayat Tugas Selesai" 
          subtitle="Daftar perjalanan dinas yang telah tuntas dilaksanakan"
          className="border border-white/10 bg-white/[0.02]"
        >
          <div className="divide-y divide-white/5 p-4">
            {completedTrips.map(trip => (
              <div key={trip.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{trip.destination}</span>
                    <Pill label="Selesai" tone="gray" />
                  </div>
                  <div className="text-[#8fa99b] text-[11px] mt-0.5">
                    {trip.date} • {trip.plate} • {trip.distance_km || 0} KM ({trip.durationMin || 60} Menit)
                  </div>
                </div>
                <div className="text-right text-[#8fa99b]">
                  {trip.requesterName} ({trip.dept})
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
