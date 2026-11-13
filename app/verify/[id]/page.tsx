'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, ShieldCheck, XCircle, Clock, MapPin, User, Building2, Calendar, Car } from 'lucide-react'
import { StoreProvider, useStore, fmtDate } from '@/lib/store'
import { YazakiBadge } from '@/components/yazaki-logo'

function VerifyContent({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams()
  const stage = searchParams.get('stage') || '1'
  const { ready, db } = useStore()
  const trip = db.trips.find((t) => t.id === tripId)

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-xs text-slate-500">Memverifikasi keabsahan dokumen...</div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-800">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle size={28} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Dokumen Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            Nomor tiket <span className="font-mono font-bold text-slate-700">{tripId}</span> tidak terdaftar dalam database operasional JAI-FLEET PT. JATIM AUTOCOMP INDONESIA.
          </p>
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

  const approvedAt = isStage1 ? trip.spvAt || fmtDate(trip.date) : isStage2 ? trip.poolSpvAt || fmtDate(trip.date) : fmtDate(trip.date)
  const notes = isStage1 ? trip.spvNote || 'Disetujui untuk penugasan dinas.' : isStage2 ? trip.poolSpvNote || 'Armada dan jadwal telah dialokasikan.' : trip.purpose

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-800 font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5">
        {/* Header Kop */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <YazakiBadge className="h-10" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">PT. JATIM AUTOCOMP INDONESIA</h3>
              <p className="text-[11px] text-slate-500">Gas Operations · Verifikasi Tanda Tangan Digital</p>
            </div>
          </div>
          <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
            {trip.id}
          </span>
        </div>

        {/* Verification Status Banner */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
              TANDA TANGAN ELEKTRONIK SAH & TERVERIFIKASI
            </h4>
            <p className="mt-0.5 text-[11px] text-emerald-800">
              Dokumen ini telah melalui proses persetujuan resmi sistem JAI-FLEET.
            </p>
          </div>
        </div>

        {/* Approver Detail */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
          <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {isStage1 ? 'Persetujuan Tahap 1 (SPV/Manager Dept)' : isStage2 ? 'Persetujuan Tahap 2 (SPV Kendaraan)' : 'Pengajuan Pemohon'}
            </span>
            <span className="rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
              Tervalidasi
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block">Nama Penandatangan:</span>
            <span className="text-sm font-bold text-slate-900">{approverName}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block">Jabatan / Otoritas:</span>
              <span className="font-semibold text-slate-800">{approverRole}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Waktu Persetujuan:</span>
              <span className="font-mono font-semibold text-slate-800">{approvedAt}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block">Catatan Approver:</span>
            <p className="mt-1 rounded bg-white p-2.5 border border-slate-200 text-slate-800 italic">
              "{notes}"
            </p>
          </div>
        </div>

        {/* Trip Overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
          <h5 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <MapPin size={13} className="text-emerald-700" /> Rincian Pengajuan Terkait
          </h5>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-slate-500 block">Pemohon:</span>
              <span className="font-semibold text-slate-900">{trip.requesterName || trip.guest} ({trip.dept})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tujuan:</span>
              <span className="font-bold text-slate-900">{trip.destination}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tanggal & Jam:</span>
              <span className="font-semibold text-slate-800">{fmtDate(trip.date)} ({trip.estDeparture} WIB)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Kendaraan & Driver:</span>
              <span className="font-semibold text-slate-800">{trip.plate || 'Standby'} {trip.driverId ? `(${trip.driverId})` : ''}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400">
          PT. Jatim Autocomp Indonesia · JAI-FLEET Management System
        </p>
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
