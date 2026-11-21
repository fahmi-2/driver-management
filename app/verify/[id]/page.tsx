'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, ShieldCheck, XCircle, Clock, MapPin, User, Building2, Calendar, Car, ArrowLeft, ExternalLink } from 'lucide-react'
import { StoreProvider, useStore, fmtDate } from '@/lib/store'
import Image from 'next/image'

function formatApprovalTimestamp(ts?: string): string {
  if (!ts) return '-'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' WIB'
  } catch {
    return ts
  }
}

function VerifyContent({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams()
  const stage = searchParams.get('stage') || '1'
  const { ready, db } = useStore()
  const trip = db.trips.find((t) => t.id === tripId)

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="rounded-xl bg-white px-5 py-3 text-xs font-semibold text-slate-800 shadow-xl">
          Memverifikasi keabsahan dokumen JAI-FLEET...
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border-2 border-rose-300 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Dokumen Tidak Ditemukan</h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Nomor tiket <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{tripId}</span> tidak ditemukan atau belum terdaftar dalam sistem operasional JAI-FLEET PT. Jatim Autocomp Indonesia.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://gaspoll.cloud"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
            >
              Kembali ke Portal gaspoll.cloud
            </a>
          </div>
        </div>
      </div>
    )
  }

  const isStage1 = stage === '1'
  const isStage2 = stage === '2'
  const approverName = isStage1
    ? trip.spvName || 'Approver Tahap 1 (SPV/Manager Dept)'
    : isStage2
    ? trip.poolSpvName || 'Hayu Prasetyo Utomo (SPV Kendaraan & Pool GA)'
    : trip.requesterName || trip.guest

  const approverRole = isStage1
    ? `${trip.approverRole || 'SPV/Manager'} Departemen ${trip.dept}`
    : isStage2
    ? 'SPV Kendaraan & Pool GA'
    : `Requester / Pemohon (${trip.dept})`

  const approvedAtRaw = isStage1 ? trip.spvAt : isStage2 ? trip.poolSpvAt : trip.date
  const approvedAtFormatted = formatApprovalTimestamp(approvedAtRaw) || fmtDate(trip.date)
  const notes = isStage1
    ? trip.spvNote || 'Disetujui untuk penugasan dinas operasional.'
    : isStage2
    ? trip.poolSpvNote || 'Armada dan jadwal pengemudi telah dialokasikan.'
    : trip.purpose

  return (
    <div className="min-h-screen bg-[#031009] py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans">
      {/* Outer Card with Deep Forest Green Theme */}
      <div className="w-full max-w-lg rounded-2xl bg-[#081f14] shadow-2xl border border-white/15 overflow-hidden text-white">
        
        {/* Header Kop Modal Style: Bright Lime Banner Header */}
        <div className="flex items-center justify-between border-b border-lime-500/20 bg-lime-400 px-5 py-4 sm:px-6 text-[#052e16]">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-24 shrink-0 bg-white px-2 py-1 rounded-lg border border-black/10 flex items-center justify-center shadow-sm">
              <Image
                src="/yazaki-official-logo.jpg"
                alt="Yazaki Logo PT. JAI"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-[#052e16] tracking-tight">
                  PT. JATIM AUTOCOMP INDONESIA
                </h1>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#0f3022]/85">
                Gas Operations · Verifikasi Tanda Tangan Digital
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-md bg-[#052e16] px-2.5 py-1 font-mono text-[11px] font-black text-lime-400 tracking-wider shadow">
              {trip.id}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Status Validasi Banner: Hijau Emerald Cerah dengan Teks Putih Tajam */}
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-600/30 p-4 text-white shadow-md flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-[#052e16] shadow font-bold">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-lime-300">
                TANDA TANGAN ELEKTRONIK SAH & TERVERIFIKASI
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-100/90 leading-snug">
                Dokumen resmi telah disetujui melalui sistem JAI-FLEET sesuai SOP Perseroan.
              </p>
            </div>
          </div>

          {/* Kotak Detail Approver: Dark Glass with Lime Accents & Crisp White Text */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3 shadow-inner">
            <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-lime-300">
                {isStage1
                  ? 'PERSETUJUAN TAHAP 1 (SPV/MANAGER DEPT)'
                  : isStage2
                  ? 'PERSETUJUAN TAHAP 2 (SPV KENDARAAN)'
                  : 'VALIDASI PEMOHON OPERASIONAL'}
              </span>
              <span className="rounded-full bg-lime-400 text-[#052e16] px-2.5 py-0.5 text-[10px] font-black tracking-wide shadow-sm">
                TERVALIDASI
              </span>
            </div>

            <div>
              <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">
                Nama Penandatangan
              </span>
              <span className="text-base sm:text-lg font-black text-white leading-tight block mt-0.5">
                {approverName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-black/30 border border-white/10 p-2.5">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">
                  Jabatan / Otoritas
                </span>
                <span className="text-xs font-bold text-white block mt-0.5">
                  {approverRole}
                </span>
              </div>
              <div className="rounded-lg bg-black/30 border border-white/10 p-2.5">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">
                  Waktu Persetujuan
                </span>
                <span className="text-xs font-mono font-bold text-white block mt-0.5">
                  {approvedAtFormatted}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-medium text-[#8fa99b] block uppercase mb-1">
                Catatan Approver
              </span>
              <div className="rounded-lg bg-black/40 border border-lime-400/30 p-3 text-white">
                <p className="text-xs font-semibold italic leading-relaxed text-lime-100">
                  "{notes}"
                </p>
              </div>
            </div>
          </div>

          {/* Kotak Rincian Pengajuan Terkait: Dark Theme dengan Teks Kontras Putih & Hijau Lime */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3 shadow-inner">
            <h3 className="font-bold text-xs uppercase tracking-wider text-lime-300 border-b border-white/10 pb-2 flex items-center gap-1.5">
              <MapPin size={15} className="text-lime-400" /> Rincian Pengajuan Terkait
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">Pemohon</span>
                <span className="font-bold text-white block mt-0.5 text-sm">
                  {trip.requesterName || trip.guest}
                </span>
                <span className="text-[11px] font-semibold text-lime-400 block mt-0.5">
                  Dept: {trip.dept} {trip.section ? `(${trip.section})` : ''}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">Tujuan & Rute</span>
                <span className="font-bold text-lime-300 block mt-0.5 text-sm line-clamp-2">
                  {trip.destination}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">Tanggal & Jam Keberangkatan</span>
                <span className="font-bold text-white block mt-0.5">
                  {fmtDate(trip.date)}
                </span>
                <span className="font-mono text-[11px] text-[#8fa99b] block mt-0.5">
                  Pukul {trip.estDeparture} {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-medium text-[#8fa99b] block uppercase">Armada Kendaraan & Driver</span>
                <span className="font-bold text-white block mt-0.5">
                  {trip.plate || 'Standby (Pool GA)'}
                </span>
                {trip.driverId && (
                  <span className="text-[11px] font-semibold text-lime-400 block mt-0.5">
                    Driver: {trip.driverId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/40 border-t border-white/10 px-6 py-3.5 text-center">
          <p className="text-[11px] font-semibold text-[#8fa99b]">
            PT. JATIM AUTOCOMP INDONESIA · JAI-FLEET Management System
          </p>
          <p className="text-[10px] text-emerald-400/80 mt-0.5">
            Diverifikasi secara otomatis via <a href="https://gaspoll.cloud" className="font-bold text-lime-400 hover:underline">gaspoll.cloud</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return (
    <StoreProvider>
      <VerifyContent tripId={resolvedParams.id} />
    </StoreProvider>
  )
}
