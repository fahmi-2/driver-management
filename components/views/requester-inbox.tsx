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
  MessageSquare,
  Edit3,
  Trash2,
  Info,
  Users,
  MapPin,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useStore, type Trip, fmtDate, fmtTime } from '@/lib/store'
import { Card, PageHeader, Pill, useToast } from '../ui-bits'
import { TripEditModal } from '../trip-edit-modal'
import { TripRouteMap } from '../route-map'

const ITEMS_PER_PAGE = 10

export function RequesterInbox({ user }: { user: Account }) {
  const { db, deleteTrip } = useStore()
  const notify = useToast()
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPROVED' | 'REJECTED' | 'PENDING'>('ALL')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null)

  // Requester trips
  const myTrips = db.trips
    .filter((t) => t.requesterUser === user.username)
    .slice()
    .reverse()

  const filteredTrips = myTrips.filter((t) => {
    const isApproved = t.status === 'READY' || t.status === 'ON_TRIP' || t.status === 'DONE'
    const isRejected = t.status === 'REJECTED'
    const isPending = t.status === 'WAITING_SPV' || t.status === 'WAITING_ASSIGN' || t.status === 'WAITING_POOL_SPV'

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

  // Pagination calculation (10 rows per slide / page)
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTrips.length)
  const paginatedTrips = filteredTrips.slice(startIndex, endIndex)

  const countApproved = myTrips.filter((t) => t.status === 'READY' || t.status === 'ON_TRIP' || t.status === 'DONE').length
  const countRejected = myTrips.filter((t) => t.status === 'REJECTED').length
  const countPending = myTrips.filter((t) => t.status === 'WAITING_SPV' || t.status === 'WAITING_ASSIGN' || t.status === 'WAITING_POOL_SPV').length

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
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Cari tujuan / tamu / no. tiket…"
                className="h-8 w-44 sm:w-56 rounded-lg bg-[#f5f7f5] pl-8 pr-3 text-[11px] outline-none border border-transparent focus:border-[#075b3d]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any)
                setCurrentPage(1)
              }}
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
          <div>
            <div className="divide-y divide-[#edf1ee]">
              {paginatedTrips.map((trip) => {
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

                    {/* Status Pill & Pre-Approval Actions */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
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
                          {trip.status === 'WAITING_SPV'
                            ? 'Menunggu SPV Dept (Tahap 1)'
                            : trip.status === 'WAITING_POOL_SPV'
                            ? 'Menunggu SPV Kendaraan (Tahap 2)'
                            : 'Menunggu Dispatcher'}
                        </span>
                      )}

                      {/* Tombol Detail Perjalanan (Pemohon, Penumpang & Map) */}
                      <button
                        type="button"
                        onClick={() => setDetailTrip(trip)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#075b3d]/30 bg-[#075b3d]/10 hover:bg-[#075b3d]/20 px-3 py-1 text-xs font-bold text-[#075b3d] transition shadow-xs"
                      >
                        <Info size={13} />
                        <span>Detail & Peta</span>
                      </button>

                      {/* Tombol Edit & Hapus (Strict Pre-Approval Phase: Hanya jika WAITING_SPV) */}
                      {trip.status === 'WAITING_SPV' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit / Revisi Pengajuan [EDITED]"
                            onClick={() => setEditingTrip(trip)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition shadow-xs"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            title="Hapus Pengajuan"
                            onClick={async () => {
                              if (confirm(`Apakah Anda yakin ingin menghapus pengajuan ${trip.id} ke ${trip.destination}?`)) {
                                const res = await deleteTrip(trip.id)
                                if (res.success) {
                                  notify(`Pengajuan ${trip.id} berhasil dihapus.`)
                                } else {
                                  notify(res.error || 'Gagal menghapus pengajuan.', 'error')
                                }
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 px-2.5 py-1 text-[11px] font-bold text-red-300 transition shadow-xs"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>
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
                    <div className="mt-3.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
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
                      <span>
                        {trip.status === 'WAITING_SPV'
                          ? 'Pengajuan baru, menunggu verifikasi E-Sign dari SPV Departemen (Tahap 1).'
                          : trip.status === 'WAITING_POOL_SPV'
                          ? 'Armada telah dipetakan oleh Admin. Sedang menunggu ACC Final dari SPV Kendaraan (Tahap 2).'
                          : 'Pengajuan telah di-ACC SPV Dept. Menunggu penjadwalan oleh Dispatcher / Admin.'}
                      </span>
                      <a
                        href={`/approve/${trip.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#b45309] hover:underline text-[11px] shrink-0 ml-2"
                      >
                        Portal E-Sign Approver &rarr;
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#edf1ee] bg-[#fafcfa] px-5 py-3 text-xs text-[#708078] rounded-b-2xl">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>Menampilkan</span>
              <strong className="text-[#075b3d] font-semibold">
                {filteredTrips.length === 0 ? 0 : startIndex + 1}–{endIndex}
              </strong>
              <span>dari</span>
              <strong className="text-[#10251c] font-semibold">{filteredTrips.length}</strong>
              <span>pengajuan</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#708078]">
                Halaman {safeCurrentPage} dari {totalPages}
              </span>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-[#e4ece6] bg-white text-[#075b3d] shadow-2xs hover:bg-[#eef5f0] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Direct Page Numbers (if <= 5 pages, show all; else sliding window) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true
                    return (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safeCurrentPage) <= 1
                    )
                  })
                  .map((pageNum, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && pageNum - prev > 1

                    return (
                      <span key={pageNum} className="inline-flex items-center">
                        {showEllipsis && <span className="px-1 text-[#93a097]">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`size-8 rounded-lg text-xs font-bold transition ${
                            pageNum === safeCurrentPage
                              ? 'bg-[#075b3d] text-white shadow-xs'
                              : 'border border-[#e4ece6] bg-white text-[#62736b] hover:bg-[#eef5f0]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      </span>
                    )
                  })}

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-[#e4ece6] bg-white text-[#075b3d] shadow-2xs hover:bg-[#eef5f0] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>

      {/* Modal Detail Perjalanan (Pemohon, Penumpang & Map) */}
      {detailTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#081f14] text-white shadow-2xl border border-white/15 overflow-hidden max-h-[90vh] flex flex-col my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#075b3d] px-6 py-4 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-lime-400 text-[#052e16] font-bold">
                  <Info size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Detail Pengajuan & Penumpang</h3>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-mono font-bold text-white">
                      {detailTrip.id}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200">
                    Departemen {detailTrip.dept} {detailTrip.section ? `· Section ${detailTrip.section}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailTrip(null)}
                className="p-1 rounded-lg text-emerald-200 hover:bg-emerald-800/40 transition"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* 1. Pemohon Utama & Rincian Dasar */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#bef264] flex items-center gap-1.5 uppercase tracking-wide">
                  <User size={14} className="text-[#a3e635]" /> Informasi Pemohon Utama
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">Nama Pemohon:</span>
                    <span className="font-bold text-white text-sm">{detailTrip.requesterName || detailTrip.guest}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">NIK Pemohon:</span>
                    <span className="font-mono font-bold text-white">{detailTrip.requesterNik || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">Departemen & Section:</span>
                    <span className="font-medium text-white">{detailTrip.dept} {detailTrip.section ? `(${detailTrip.section})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">Approver Tahap 1:</span>
                    <span className="font-semibold text-white">{detailTrip.spvName}</span>
                  </div>
                </div>
              </div>

              {/* 2. Daftar Penumpang Berangkat */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#bef264] flex items-center gap-1.5 uppercase tracking-wide">
                    <Users size={14} className="text-[#a3e635]" /> Penumpang yang Berangkat
                  </h4>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                    {detailTrip.driverOnly ? '0 Orang (Hanya Driver)' : `${(detailTrip.passengers?.length || 1)} Orang`}
                  </span>
                </div>

                {detailTrip.driverOnly ? (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Perjalanan berstatus <strong>Hanya Driver (Driver Only)</strong> untuk keperluan pengiriman barang atau dokumen logistik pabrik tanpa penumpang.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/20">
                    {/* Pemohon sebagai penumpang 1 jika tidak ada list terpisah */}
                    {(!detailTrip.passengers || detailTrip.passengers.length === 0) ? (
                      <div className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-5 items-center justify-center rounded-full bg-[#a3e635] text-[10px] font-bold text-black">
                            1
                          </span>
                          <div>
                            <p className="font-bold text-white">{detailTrip.requesterName || detailTrip.guest}</p>
                            <p className="text-[10px] text-[#8fa99b]">NIK: {detailTrip.requesterNik || '—'} · Dept: {detailTrip.dept}</p>
                          </div>
                        </div>
                        <span className="rounded bg-[#a3e635]/20 text-[#bef264] px-2 py-0.5 text-[10px] font-bold">
                          Pemohon Utama
                        </span>
                      </div>
                    ) : (
                      detailTrip.passengers.map((p, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-5 items-center justify-center rounded-full bg-[#a3e635] text-[10px] font-bold text-black">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-white">{p.name}</p>
                              <p className="text-[10px] text-[#8fa99b]">NIK: {p.nik || '—'} · Dept: {p.dept || detailTrip.dept}</p>
                            </div>
                          </div>
                          <span className="rounded bg-white/10 text-white px-2 py-0.5 text-[10px]">
                            {idx === 0 ? 'Pemohon Utama' : `Penumpang #${idx + 1}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Detail Jadwal, Tujuan & Keperluan */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-xs">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">Tanggal Perjalanan:</span>
                    <span className="font-bold text-white">{fmtDate(detailTrip.date)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8fa99b] block">Estimasi Waktu:</span>
                    <span className="font-semibold text-white">
                      Jam {detailTrip.estDeparture} {detailTrip.estReturn ? `– ${detailTrip.estReturn}` : ''} WIB
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-[#8fa99b] block">Tujuan & Rute:</span>
                    <span className="font-bold text-[#bef264] text-sm">{detailTrip.destination}</span>
                    {detailTrip.destinations && detailTrip.destinations.length > 1 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {detailTrip.destinations.map((d, i) => (
                          <span key={i} className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white">
                            Stop {i + 1}: {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-[#8fa99b] block">Keperluan:</span>
                    <span className="text-white">{detailTrip.purpose}</span>
                  </div>
                </div>
              </div>

              {/* 4. Peta Rute Interaktif */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#bef264] flex items-center gap-1.5 uppercase tracking-wide">
                    <MapIcon size={14} className="text-[#a3e635]" /> Peta Rute Perjalanan PT. JAI
                  </h4>
                  {detailTrip.distance_km && (
                    <span className="text-[11px] font-bold text-[#a3e635]">
                      {detailTrip.distance_km} KM PP
                    </span>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <TripRouteMap
                    destinations={detailTrip.destinations}
                    destination={detailTrip.destination}
                    height={260}
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end border-t border-white/10 bg-[#052115] px-6 py-3.5 shrink-0">
              <button
                type="button"
                onClick={() => setDetailTrip(null)}
                className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2 text-xs font-bold text-white transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Permohonan (Pre-Approval Phase) */}
      <TripEditModal
        trip={editingTrip}
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
      />
    </>
  )
}
