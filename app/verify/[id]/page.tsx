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
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans">
      {/* Outer Card with High Contrast Pure White Background */}
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border-2 border-slate-300 overflow-hidden text-slate-900">
        
        {/* Header Kop Resmi PT. JAI */}
        <div className="bg-slate-50 border-b-2 border-slate-200 px-5 py-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-28 shrink-0 bg-white p-1 rounded border border-slate-200 flex items-center justify-center">
              <Image
                src="/yazaki-official-logo.jpg"
                alt="Yazaki Logo PT. JAI"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-slate-950 leading-tight">
                PT. JATIM AUTOCOMP INDONESIA
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                Gas Operations · Verifikasi Digital
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-black text-white tracking-wider shadow-sm">
              {trip.id}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Status Validasi Banner: Ultra Kontras Hijau */}
          <div className="rounded-xl border-2 border-emerald-600 bg-emerald-500 p-4 text-white shadow-md flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow">
              <ShieldCheck size={26} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-sm">
                TANDA TANGAN ELEKTRONIK SAH & TERVERIFIKASI
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-50 leading-snug">
                Dokumen resmi telah disetujui melalui sistem JAI-FLEET sesuai SOP Perseroan.
              </p>
            </div>
          </div>

          {/* Kotak Detail Approver: White Card with Deep Dark Text */}
          <div className="rounded-xl border-2 border-slate-300 bg-white p-4 space-y-3 shadow-sm">
            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                {isStage1
                  ? 'PERSETUJUAN TAHAP 1 (SPV/MANAGER DEPT)'
                  : isStage2
                  ? 'PERSETUJUAN TAHAP 2 (SPV KENDARAAN)'
                  : 'VALIDASI PEMOHON OPERASIONAL'}
              </span>
              <span className="rounded-md bg-emerald-100 border border-emerald-400 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                TERVALIDASI
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Nama Penandatangan
              </span>
              <span className="text-base sm:text-lg font-black text-slate-950 leading-tight block">
                {approverName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Jabatan / Otoritas
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {approverRole}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Waktu Persetujuan
                </span>
                <span className="text-xs font-black font-mono text-slate-900 block mt-0.5">
                  {approvedAtFormatted}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Catatan Approver
              </span>
              <div className="rounded-lg bg-amber-50/80 border-2 border-amber-200 p-3 text-slate-950">
                <p className="text-xs font-bold italic leading-relaxed">
                  "{notes}"
                </p>
              </div>
            </div>
          </div>

          {/* Kotak Rincian Pengajuan Terkait: Clean High Contrast */}
          <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-4 space-y-3 shadow-sm">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <MapPin size={15} className="text-emerald-700" /> Rincian Pengajuan Terkait
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Pemohon</span>
                <span className="font-black text-slate-950 block mt-0.5">
                  {trip.requesterName || trip.guest} <span className="text-emerald-800">({trip.dept})</span>
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Tujuan</span>
                <span className="font-black text-slate-950 block mt-0.5 line-clamp-2">
                  {trip.destination}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Tanggal & Jam Keberangkatan</span>
                <span className="font-black text-slate-950 block mt-0.5">
                  {fmtDate(trip.date)} <span className="font-mono text-slate-700">({trip.estDeparture} WIB)</span>
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Armada Kendaraan & Driver</span>
                <span className="font-black text-slate-950 block mt-0.5">
                  {trip.plate || 'Standby'} {trip.driverId ? `(${trip.driverId})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 text-center">
          <p className="text-[10px] font-bold text-slate-600">
            PT. JATIM AUTOCOMP INDONESIA · JAI-FLEET Management System
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">
            Diverifikasi secara otomatis via <a href="https://gaspoll.cloud" className="font-semibold text-emerald-700 hover:underline">gaspoll.cloud</a>
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
