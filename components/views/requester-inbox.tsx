'use client'

import { useState } from 'react'
import {
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  User,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  Filter,
  MessageSquare
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useStore, type Trip, fmtDate, fmtTime } from '@/lib/store'
import { Card, PageHeader, Pill } from '../ui-bits'

export function RequesterInbox({ user }: { user: Account }) {
  const { db } = useStore()
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPROVED' | 'REJECTED' | 'PENDING'>('ALL')
  const [search, setSearch] = useState('')

  // Requester trips
  const myTrips = db.trips
    .filter((t) => t.requesterUser === user.username)
    .slice()
    .reverse()

  const filteredTrips = myTrips.filter((t) => {
    const isApproved = t.status === 'READY' || t.status === 'ON_TRIP' || t.status === 'DONE'
    const isRejected = t.status === 'REJECTED'
    const isPending = t.status === 'WAITING_SPV' || t.status === 'WAITING_ASSIGN'

    if (filterStatus === 'APPROVED' && !isApproved) return false
    if (filterStatus === 'REJECTED' && !isRejected) return false
    if (filterStatus === 'PENDING' && !isPending) return false

    const matchSearch =
      t.destination.toLowerCase().includes(search.toLowerCase()) ||
      t.purpose.toLowerCase().includes(search.toLowerCase()) ||
      t.guest.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())

    return matchSearch
  })

  const countApproved = myTrips.filter((t) => t.status === 'READY' || t.status === 'ON_TRIP' || t.status === 'DONE').length
  const countRejected = myTrips.filter((t) => t.status === 'REJECTED').length
  const countPending = myTrips.filter((t) => t.status === 'WAITING_SPV' || t.status === 'WAITING_ASSIGN').length

  return (
    <>
      <PageHeader
        title="Kotak Masuk & Riwayat Pengajuan"
        desc={`Pantau status putusan pengajuan kendaraan Anda · Departemen ${user.dept}`}
      />

      {/* KPI Stats Bar */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Disetujui & Dijadwalkan</p>
            <p className="mt-1 text-2xl font-bold text-[#168052]">{countApproved} Trip</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#dff5e9] text-[#168052]">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Ditolak (Rejected)</p>
            <p className="mt-1 text-2xl font-bold text-[#b91c1c]">{countRejected} Trip</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#fee2e2] text-[#b91c1c]">
            <XCircle size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#e4ece6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-medium text-[#708078]">Dalam Proses Review</p>
            <p className="mt-1 text-2xl font-bold text-[#d97706]">{countPending} Trip</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#fef3c7] text-[#d97706]">
            <Clock size={20} />
          </div>
        </div>
      </div>

      <Card
        title="Daftar Putusan & Riwayat"
        subtitle="Keputusan final Admin Utama & SPV beserta armada, supir, dan catatan verifikasi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#93a097]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tujuan / tamu / no. tiket…"
                className="h-8 w-44 sm:w-56 rounded-lg bg-[#f5f7f5] pl-8 pr-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-8 rounded-lg bg-[#f5f7f5] px-2.5 text-[11px] font-medium text-[#62736b] outline-none border border-transparent focus:border-[#075b3d]"
            >
              <option value="ALL">Semua Keputusan</option>
              <option value="APPROVED">Disetujui (Approved)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
              <option value="PENDING">Menunggu Review</option>
            </select>
          </div>
        }
      >
        {filteredTrips.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#9aa7a0]">
            Tidak ada riwayat pengajuan yang sesuai kriteria.
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ee]">
            {filteredTrips.map((trip) => {
              const isApproved =
                trip.status === 'READY' || trip.status === 'ON_TRIP' || trip.status === 'DONE'
              const isRejected = trip.status === 'REJECTED'
              const assignedDriver = db.drivers.find((d) => d.id === trip.driverId)
              const assignedVehicle = db.vehicles.find((v) => v.plate === trip.plate)

              return (
                <div key={trip.id} className="p-5 transition hover:bg-lime-400/10 rounded-xl m-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#075b3d]">
                          {trip.id}
                        </span>
                        <span className="rounded-md bg-[#eef5f0] px-2 py-0.5 text-[10px] font-semibold text-[#075b3d]">
                          {trip.category}
                        </span>
                        <span className="text-[11px] text-[#93a097]">
                          Diajukan untuk {fmtDate(trip.date)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-[#10251c]">
                        {trip.destination}
                      </h3>
                      <p className="text-xs text-[#708078] mt-0.5">
                        Keperluan: {trip.purpose}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff5e9] px-3 py-1 text-xs font-bold text-[#168052]">
                          <CheckCircle size={14} />
                          Disetujui & Dijadwalkan
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-bold text-[#b91c1c]">
                          <XCircle size={14} />
                          Ditolak (Rejected)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#d97706]">
                          <Clock size={14} />
                          {trip.status === 'WAITING_SPV' ? 'Menunggu Approval SPV' : 'Menunggu Dispatcher'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Card if Approved or Rejected */}
                  {isApproved && (
                    <div className="mt-3.5 rounded-xl border border-lime-400/30 bg-[#062417] p-3.5 text-xs text-[#ecfdf5]">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-[#a3e635]" />
                          <div>
                            <p className="text-[10px] text-[#9bb7a8]">Armada Ditugaskan:</p>
                            <p className="font-bold text-white">
                              {trip.plate} ({assignedVehicle?.type || 'Mobil Pool'})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <User size={16} className="text-[#a3e635]" />
                          <div>
                            <p className="text-[10px] text-[#9bb7a8]">Driver (Sopir):</p>
                            <p className="font-bold text-white">
                              {assignedDriver ? `${assignedDriver.name} (${assignedDriver.phone || '-'})` : 'Standby Driver'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#a3e635]" />
                          <div>
                            <p className="text-[10px] text-[#9bb7a8]">Jadwal Keberangkatan:</p>
                            <p className="font-bold text-white">
                              {trip.estDeparture} {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB
                            </p>
                          </div>
                        </div>
                      </div>

                      {trip.adminNote && (
                        <div className="mt-2.5 border-t border-lime-400/20 pt-2 text-[11px] text-[#d9f99d]">
                          <strong className="text-white">Catatan Admin Utama:</strong> {trip.adminNote}
                        </div>
                      )}
                    </div>
                  )}

                  {isRejected && (
                    <div className="mt-3.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3.5 text-xs text-[#991b1b]">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-[#dc2626] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Alasan Penolakan dari Admin / SPV:</p>
                          <p className="mt-1 text-[11px] text-[#7f1d1d] whitespace-pre-wrap">
                            "{trip.rejectReason || 'Maaf, pengajuan tidak dapat diproses pada jadwal tersebut.'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SPV or Waiting Notes */}
                  {!isApproved && !isRejected && (
                    <div className="mt-3 rounded-xl border border-[#fef08a] bg-[#fefce8] p-3 text-xs text-[#854d0e] flex items-center justify-between">
                      <span>Pengajuan sedang dalam antrean penjadwalan oleh Dispatcher / Admin Utama.</span>
                      {trip.status === 'WAITING_SPV' && (
                        <a
                          href={`/approve/${trip.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#b45309] hover:underline text-[11px]"
                        >
                          Simulasi Email E-Sign SPV &rarr;
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
