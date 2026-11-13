'use client'

import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Calendar,
  User,
  Users,
  ShieldCheck,
  Building2,
  Car,
  QrCode,
  Info,
  ExternalLink,
} from 'lucide-react'
import { Trip, STATUS_LABEL, fmtDate } from '@/lib/store'
import { YazakiBadge, YazakiEmblem } from './yazaki-logo'
import { TripRouteMap } from './route-map'
import { ModalPortal } from './modal-portal'

interface TripReportSummaryModalProps {
  trip: Trip | null
  isOpen: boolean
  onClose: () => void
}

export function TripReportSummaryModal({ trip, isOpen, onClose }: TripReportSummaryModalProps) {
  const [spvQrCodeUrl, setSpvQrCodeUrl] = useState<string>('')
  const [poolQrCodeUrl, setPoolQrCodeUrl] = useState<string>('')
  const [selectedQrDetail, setSelectedQrDetail] = useState<{
    stage: string
    title: string
    approverName: string
    approverRole: string
    approvedAt?: string
    notes?: string
    status: 'APPROVED' | 'REJECTED' | 'WAITING'
    verifyUrl: string
  } | null>(null)

  const printAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trip) return

    // Base URL aplikasi untuk link verifikasi web publik
    const baseUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://gaspoll.cloud')

    // Helper untuk membuat QR Code bergaya modern (seperti Instagram QR / High Contrast Clean Dot)
    const generateInstagramStyleQr = async (url: string, accentColor: string = '#0284c7') => {
      // 1. Generate base high-resolution QR canvas dari qrcode library
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, url, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'H', // Error correction level H agar bisa menampung logo tengah
        color: {
          dark: '#0f172a', // Slate 900 kontras tajam
          light: '#ffffff', // Putih bersih
        },
      })

      const ctx = canvas.getContext('2d')
      if (ctx) {
        const size = canvas.width
        const center = size / 2
        const badgeRadius = 32

        // Gambar badge tengah bergradasi / rounded modern seperti Instagram QR
        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, badgeRadius, 0, Math.PI * 2, true)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.lineWidth = 4
        ctx.strokeStyle = accentColor
        ctx.stroke()

        // Gambar ikon verified / check di tengah
        ctx.beginPath()
        ctx.arc(center, center, badgeRadius - 6, 0, Math.PI * 2, true)
        ctx.fillStyle = accentColor
        ctx.fill()

        // Simbol checklist putih di dalam lingkaran tengah
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('✓', center, center + 1)
        ctx.restore()
      }

      return canvas.toDataURL('image/png')
    }

    // 1. QR Code Tahap 1 (SPV / Manager Dept)
    const isSpvApproved =
      trip.spvAt ||
      ['WAITING_ASSIGN', 'WAITING_POOL_SPV', 'READY', 'ON_TRIP', 'DONE'].includes(trip.status)

    if (isSpvApproved) {
      const verifyUrl = `${baseUrl}/verify/${trip.id}?stage=1`
      generateInstagramStyleQr(verifyUrl, '#0284c7')
        .then(setSpvQrCodeUrl)
        .catch(console.error)
    } else {
      setSpvQrCodeUrl('')
    }

    // 2. QR Code Tahap 2 (SPV Kendaraan / Pool GA)
    const isPoolApproved =
      trip.poolSpvAt || ['READY', 'ON_TRIP', 'DONE'].includes(trip.status)

    if (isPoolApproved) {
      const verifyUrl = `${baseUrl}/verify/${trip.id}?stage=2`
      generateInstagramStyleQr(verifyUrl, '#0d9488')
        .then(setPoolQrCodeUrl)
        .catch(console.error)
    } else {
      setPoolQrCodeUrl('')
    }
  }, [trip])

  if (!isOpen || !trip) return null

  // Helper status teks
  const getStatusText = () => {
    switch (trip.status) {
      case 'READY':
      case 'DONE':
        return 'DISETUJUI & DIJADWALKAN (READY)'
      case 'ON_TRIP':
        return 'SEDANG BERTUGAS (ON TRIP)'
      case 'WAITING_SPV':
        return 'MENUNGGU APPROVE TAHAP 1 (SPV DEPT)'
      case 'WAITING_POOL_SPV':
      case 'WAITING_ASSIGN':
        return 'MENUNGGU VERIFIKASI TAHAP 2 (SPV KENDARAAN)'
      case 'REJECTED':
        return `DITOLAK: ${trip.rejectReason || 'Tidak disetujui'}`
      default:
        return trip.status
    }
  }

  const formattedDate = fmtDate(trip.date)

  const handlePrint = () => {
    window.print()
  }

  const baseUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://gaspoll.cloud')

  return (
    <ModalPortal onClose={onClose}>
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-black overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-black font-sans print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-auto">
        {/* CSS Khusus Cetak / Download PDF: Strictly Background Putih & Line Hitam */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-summary-card, #print-summary-card * {
                visibility: visible !important;
              }
              #print-summary-card {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10mm 15mm !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        {/* Modal Topbar (Non-Print: Hitam Pekat dengan Tombol Aksi Kontras) */}
        <div className="no-print flex items-center justify-between border-b-2 border-black bg-black px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#a3e635] text-[#052e16] shadow-md font-bold">
              <FileText size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Laporan Summary Pengajuan Kendaraan</h3>
                <span className="rounded bg-white/20 px-2 py-0.5 font-mono text-xs font-black text-[#a3e635]">
                  {trip.id}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Dokumen resmi format putih & garis hitam dengan verifikasi QR Code Scanner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#a3e635] bg-[#a3e635] hover:bg-[#bef264] text-[#052e16] px-4 py-2 text-xs font-black shadow-md transition hover:scale-[1.02]"
              title="Cetak atau Simpan sebagai Dokumen PDF (Ctrl+P)"
            >
              <Printer size={16} className="stroke-[2.5]" />
              <span>Cetak / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 p-2 text-white transition hover:bg-white/20"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Canvas: Kertas Putih Bersih dengan Garis Hitam (Format Laporan Resmi) */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-6 print:p-0 print:bg-white">
          <div
            id="print-summary-card"
            ref={printAreaRef}
            className="mx-auto max-w-3xl rounded-none border-2 border-black bg-white p-6 sm:p-8 shadow-sm text-black print:border-none print:shadow-none print:p-0"
          >
            {/* 1. KOP SURAT FORMAL */}
            <div className="border-b-2 border-black pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <YazakiEmblem className="h-10 w-auto" />
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-black">
                      PT. JATIM AUTOCOMP INDONESIA
                    </h1>
                    <p className="text-xs font-bold text-black uppercase">
                      YAZAKI GROUP · GENERAL AFFAIRS & FLEET MANAGEMENT DIVISION
                    </p>
                    <p className="text-[10px] text-black">
                      Kawasan Berikat PT. JAI, Jl. Raya Pasuruan - Mojokerto KM 18, Pasuruan, Jawa Timur
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-none border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black text-black">
                    FORM-GA-04A
                  </span>
                  <p className="mt-1 font-mono text-[10px] font-bold text-black">NO: {trip.id}</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-black underline decoration-black decoration-2 underline-offset-4">
                  SURAT PERMOHONAN & PERJALANAN DINAS KENDARAAN OPERASIONAL
                </h2>
                <p className="mt-1 text-xs text-black font-medium">
                  Tanggal Pengajuan: <strong className="font-bold">{formattedDate}</strong> · Nomor Tiket:{' '}
                  <span className="font-mono font-black">{trip.id}</span>
                </p>
              </div>
            </div>

            {/* 2. STATUS PENGAJUAN (KOTAK PUTIH DENGAN LINE HITAM TEGAS) */}
            <div className="mt-4 border-2 border-black bg-white p-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="font-bold uppercase text-[10px] block text-black">STATUS DOKUMEN:</span>
                  <strong className="text-sm font-black text-black">{getStatusText()}</strong>
                </div>
                <div className="text-right">
                  <span className="font-bold uppercase text-[10px] block text-black">KATEGORI:</span>
                  <strong className="text-xs font-bold uppercase text-black">{trip.category}</strong>
                </div>
              </div>
            </div>

            {/* 3. IDENTITAS PEMOHON (KOTAK PUTIH LINE HITAM) */}
            <div className="mt-4 border-2 border-black bg-white p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-black border-b-2 border-black pb-1.5 mb-3">
                I. IDENTITAS PEMOHON (REQUESTER)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Nama Lengkap:</span>
                  <span className="font-black text-sm text-black">
                    {trip.requesterName || trip.guest || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">NIK Pemohon:</span>
                  <span className="font-mono font-bold text-black">
                    {trip.requesterNik || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Departemen:</span>
                  <span className="font-bold text-black">{trip.dept}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Section / Bagian:</span>
                  <span className="font-bold text-black">{trip.section || 'Seluruh Departemen'}</span>
                </div>
              </div>
            </div>

            {/* 4. RINCIAN TUJUAN & JADWAL PERJALANAN (KOTAK PUTIH LINE HITAM) */}
            <div className="mt-4 border-2 border-black bg-white p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-black border-b-2 border-black pb-1.5 mb-3">
                II. RINCIAN TUJUAN & JADWAL PERJALANAN
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-black block">Titik Awal (Origin):</span>
                    <span className="font-bold text-black">{trip.origin || 'PT. JAI Pasuruan'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-black block">Tujuan Utama / Rute:</span>
                    <span className="font-black text-black text-sm">{trip.destination}</span>
                    {trip.destinations && trip.destinations.length > 1 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {trip.destinations.map((d, i) => (
                          <span key={i} className="border border-black px-1.5 py-0.5 text-[10px] font-medium text-black">
                            Stop {i + 1}: {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-black block">Keperluan / Alasan Kunjungan:</span>
                    <p className="font-medium text-black border border-black p-2 leading-relaxed">
                      {trip.purpose}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:border-l-2 sm:border-black sm:pl-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-black block">Tanggal Berangkat:</span>
                      <span className="font-bold text-black">{formattedDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-black block">Estimasi Waktu:</span>
                      <span className="font-bold text-black">
                        {trip.estDeparture} {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-black block">Estimasi Jarak Tempuh:</span>
                      <span className="font-bold text-black">
                        {trip.distance_km ? `${trip.distance_km} KM (${trip.returnToOrigin ? 'PP' : 'Sekali Jalan'})` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-black block">Estimasi Durasi:</span>
                      <span className="font-bold text-black">
                        {trip.estimated_duration_minutes ? `~${trip.estimated_duration_minutes} Menit` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Alokasi Driver & Plat */}
                  <div className="border border-black p-2 text-xs">
                    <span className="text-[10px] font-bold uppercase text-black block">Alokasi Armada & Pengemudi:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-black text-black">
                        {trip.plate || 'Belum Ditugaskan (Menunggu Verifikasi)'}
                      </span>
                      <span className="font-mono text-xs font-bold text-black">
                        {trip.driverId ? `Driver: ${trip.driverId}` : 'Pool GA'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rombongan Penumpang */}
              <div className="mt-4 border-t-2 border-black pt-3">
                <span className="text-[10px] font-black uppercase text-black block mb-2">
                  Daftar Penumpang yang Berangkat ({trip.driverOnly ? '0 Orang - Hanya Driver' : `${trip.passengers && trip.passengers.length > 0 ? trip.passengers.length : 1} Orang`}):
                </span>

                {trip.driverOnly ? (
                  <p className="border border-black p-2 text-xs italic text-black font-medium">
                    Kendaraan berjalan tanpa penumpang (keperluan distribusi barang / dokumen pabrik).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(!trip.passengers || trip.passengers.length === 0) ? (
                      <div className="flex items-center gap-2 border border-black p-2 text-xs">
                        <span className="flex size-5 items-center justify-center border border-black text-[10px] font-black text-black">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-black">{trip.requesterName || trip.guest}</p>
                          <p className="text-[10px] text-black">NIK: {trip.requesterNik || '—'} · Dept: {trip.dept}</p>
                        </div>
                      </div>
                    ) : (
                      trip.passengers.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 border border-black p-2 text-xs">
                          <span className="flex size-5 items-center justify-center border border-black text-[10px] font-black text-black">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-bold text-black truncate">{p.name}</p>
                            <p className="text-[10px] text-black truncate">NIK: {p.nik || '—'} · Dept: {p.dept || trip.dept}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. PETA RUTE KESELURUHAN (KOTAK PUTIH LINE HITAM) */}
            <div className="mt-4 border-2 border-black bg-white p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-black">
                  III. PETA RUTE PERJALANAN (GENERAL OVERVIEW)
                </h4>
                {trip.distance_km && (
                  <span className="font-mono text-xs font-black text-black">
                    Total Jarak: {trip.distance_km} KM
                  </span>
                )}
              </div>
              <div className="overflow-hidden border border-black h-[220px]">
                <TripRouteMap
                  destinations={trip.destinations}
                  destination={trip.destination}
                  height={220}
                />
              </div>
              <p className="mt-1 text-[10px] text-black italic text-center">
                *Visualisasi koordinat rute keberangkatan & titik tujuan resmi armada PT. JAI.
              </p>
            </div>

            {/* 6. LEMBAR PENGESAHAN & QR CODE SIMPEL STYLE (SEPERTI INSTAGRAM QR DENGAN VERIFIED BADGE DI TENGAH) */}
            <div className="mt-6 border-t-2 border-black pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-black text-center mb-1">
                IV. LEMBAR PENGESAHAN & TANDA TANGAN DIGITAL (E-SIGN)
              </h4>
              <p className="text-[11px] text-black text-center mb-4 max-w-lg mx-auto">
                Scan kode QR di bawah menggunakan kamera HP atau Google Lens untuk membuka halaman verifikasi keabsahan dokumen tanda tangan elektronik.
              </p>

              {/* 3 Kolom Tanda Tangan Formal: Pemohon, Approver Tahap 1, Approver Tahap 2 */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Kolom 1: Pemohon */}
                <div className="border-2 border-black bg-white p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black block">Diajukan Oleh</span>
                    <span className="text-xs font-bold text-black">Pemohon (Requester)</span>
                  </div>

                  {/* QR Pemohon */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 border border-black p-1 flex items-center justify-center bg-white shadow-2xs">
                      {spvQrCodeUrl ? (
                        <img
                          src={spvQrCodeUrl}
                          alt="QR Diajukan"
                          className="size-full object-contain cursor-pointer"
                          title="Klik untuk membuka detail verifikasi"
                          onClick={() => {
                            setSelectedQrDetail({
                              stage: 'PENGAJUAN AWAL',
                              title: 'Tanda Tangan Elektronik Pemohon',
                              approverName: trip.requesterName || trip.guest,
                              approverRole: `Requester (${trip.dept})`,
                              approvedAt: formattedDate,
                              notes: `Tujuan: ${trip.destination} | Keperluan: ${trip.purpose}`,
                              status: 'APPROVED',
                              verifyUrl: `${baseUrl}/verify/${trip.id}?stage=requester`,
                            })
                          }}
                        />
                      ) : (
                        <div className="text-[9px] text-black font-bold text-center">
                          <CheckCircle2 size={20} className="mx-auto mb-1 text-black" />
                          Diajukan
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-black mt-1">Status: Terkirim</span>
                  </div>

                  <div className="border-t border-black pt-1.5">
                    <p className="font-black text-xs text-black truncate" title={trip.requesterName || trip.guest}>
                      {trip.requesterName || trip.guest}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-black">
                      NIK: {trip.requesterNik || '—'}
                    </p>
                  </div>
                </div>

                {/* Kolom 2: Approver Tahap 1 (SPV / Manager Dept) */}
                <div className="border-2 border-black bg-white p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black block">Persetujuan Tahap 1</span>
                    <span className="text-xs font-bold text-black">SPV / Manager Dept</span>
                  </div>

                  {/* QR Approver 1 */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 border border-black p-1 flex items-center justify-center bg-white shadow-2xs">
                      {spvQrCodeUrl ? (
                        <img
                          src={spvQrCodeUrl}
                          alt="QR E-Sign Approver 1"
                          className="size-full object-contain cursor-pointer hover:scale-105 transition"
                          title="Klik untuk membuka detail verifikasi"
                          onClick={() => {
                            setSelectedQrDetail({
                              stage: 'PERSETUJUAN TAHAP 1',
                              title: 'E-Sign Manager / SSPV Departemen',
                              approverName: trip.spvName || 'Approver Tahap 1',
                              approverRole: `${trip.approverRole || 'SPV/Manager'} Departemen ${trip.dept}`,
                              approvedAt: trip.spvAt || trip.date + ' (Tervalidasi)',
                              notes: trip.spvNote || 'Disetujui untuk penugasan operasional.',
                              status: 'APPROVED',
                              verifyUrl: `${baseUrl}/verify/${trip.id}?stage=1`,
                            })
                          }}
                        />
                      ) : trip.status === 'REJECTED' ? (
                        <div className="text-[9px] text-black font-black text-center">
                          <XCircle size={20} className="mx-auto mb-1 text-black" />
                          Ditolak
                        </div>
                      ) : (
                        <div className="text-[9px] text-black font-bold text-center">
                          <Clock size={20} className="mx-auto mb-1 text-black animate-spin" />
                          Menunggu
                          <br />
                          Persetujuan
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] mt-1 font-black text-black">
                      {spvQrCodeUrl ? '✓ Terverifikasi' : 'Tahap 1 Pending'}
                    </span>
                  </div>

                  <div className="border-t border-black pt-1.5">
                    <p className="font-black text-xs text-black truncate" title={trip.spvName}>
                      {trip.spvName || 'SPV / Manager'}
                    </p>
                    <p className="text-[10px] font-bold text-black">
                      {trip.dept} Dept.
                    </p>
                  </div>
                </div>

                {/* Kolom 3: Approver Tahap 2 (SPV Kendaraan / Pool GA) */}
                <div className="border-2 border-black bg-white p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black block">Persetujuan Tahap 2</span>
                    <span className="text-xs font-bold text-black">SPV Kendaraan (Pool GA)</span>
                  </div>

                  {/* QR Approver 2 */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 border border-black p-1 flex items-center justify-center bg-white shadow-2xs">
                      {poolQrCodeUrl ? (
                        <img
                          src={poolQrCodeUrl}
                          alt="QR E-Sign Approver 2"
                          className="size-full object-contain cursor-pointer hover:scale-105 transition"
                          title="Klik untuk membuka detail verifikasi"
                          onClick={() => {
                            setSelectedQrDetail({
                              stage: 'PERSETUJUAN TAHAP 2 (FINAL)',
                              title: 'E-Sign SPV Kendaraan / Pool GA',
                              approverName: trip.poolSpvName || 'Hayu Prasetyo Utomo',
                              approverRole: 'SPV Kendaraan & Pool GA PT. JAI',
                              approvedAt: trip.poolSpvAt || trip.date + ' (Tervalidasi)',
                              notes: trip.poolSpvNote || 'Armada dan jadwal telah dialokasikan.',
                              status: 'APPROVED',
                              verifyUrl: `${baseUrl}/verify/${trip.id}?stage=2`,
                            })
                          }}
                        />
                      ) : trip.status === 'REJECTED' ? (
                        <div className="text-[9px] text-black font-black text-center">
                          <XCircle size={20} className="mx-auto mb-1 text-black" />
                          Ditolak
                        </div>
                      ) : (
                        <div className="text-[9px] text-black font-bold text-center">
                          <Clock size={20} className="mx-auto mb-1 text-black animate-spin" />
                          Menunggu
                          <br />
                          Verifikasi Armada
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] mt-1 font-black text-black">
                      {poolQrCodeUrl ? '✓ Terverifikasi' : 'Tahap 2 Pending'}
                    </span>
                  </div>

                  <div className="border-t border-black pt-1.5">
                    <p className="font-black text-xs text-black truncate" title={trip.poolSpvName || 'Hayu Prasetyo Utomo'}>
                      {trip.poolSpvName || 'Hayu Prasetyo Utomo'}
                    </p>
                    <p className="text-[10px] font-bold text-black">
                      SPV Kendaraan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Dokumen Cetak */}
            <div className="mt-8 border-t-2 border-black pt-3 text-[10px] font-medium text-black flex items-center justify-between">
              <span>Dicetak secara otomatis melalui JAI-FLEET System · PT. Jatim Autocomp Indonesia</span>
              <span className="font-bold">Halaman 1 dari 1 · Form Sah Operasional</span>
            </div>
          </div>
        </div>

        {/* Modal Pop-up Rincian Scan QR Code (Bisa langsung dibuka atau diakses via browser) */}
        {selectedQrDetail && (
          <div className="no-print absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-2xl text-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-black text-white">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-black">{selectedQrDetail.title}</h4>
                    <span className="text-[10px] font-mono font-bold uppercase text-black">
                      {selectedQrDetail.stage}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQrDetail(null)}
                  className="rounded-lg p-1 text-black hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="border-2 border-black bg-white p-4 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Nama Penandatangan (Approver):</span>
                  <span className="text-sm font-black text-black">{selectedQrDetail.approverName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Jabatan / Otoritas:</span>
                  <span className="font-bold text-black">{selectedQrDetail.approverRole}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Waktu Persetujuan:</span>
                  <span className="font-mono font-bold text-black">
                    {selectedQrDetail.approvedAt || 'Tervalidasi'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black block">Catatan Approver:</span>
                  <p className="border border-black p-2 text-black italic">
                    "{selectedQrDetail.notes || 'Disetujui sesuai permohonan.'}"
                  </p>
                </div>
                <div className="pt-1 border-t border-black flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-black">URL Verifikasi Online:</span>
                  <a
                    href={selectedQrDetail.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-xs underline flex items-center gap-1 text-blue-700 hover:text-blue-900"
                  >
                    Buka Link Web <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedQrDetail(null)}
                  className="w-full rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}
