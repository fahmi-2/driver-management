'use client'

import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import {
  FileText,
  Printer,
  Download,
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
  Loader2,
} from 'lucide-react'
import { Trip, STATUS_LABEL, fmtDate } from '@/lib/store'
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
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
  const printIframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!trip) return

    // Base URL resmi aplikasi untuk link verifikasi web publik (Prioritaskan domain resmi gaspoll.cloud)
    const baseUrl = 'https://gaspoll.cloud'

    // Helper untuk membuat QR Code bergaya modern (seperti Instagram QR / High Contrast Clean Dot)
    const generateInstagramStyleQr = async (url: string, accentColor: string = '#0284c7') => {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, url, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })

      const ctx = canvas.getContext('2d')
      if (ctx) {
        const size = canvas.width
        const center = size / 2
        const badgeRadius = 32

        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, badgeRadius, 0, Math.PI * 2, true)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.lineWidth = 4
        ctx.strokeStyle = accentColor
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(center, center, badgeRadius - 6, 0, Math.PI * 2, true)
        ctx.fillStyle = accentColor
        ctx.fill()

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

  const baseUrl = 'https://gaspoll.cloud'

  // HTML Generator khusus cetak / download PDF: Strictly Latar Putih & Line Hitam
  const generateFormalPrintHtml = () => {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan_Pengajuan_${trip.id}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 11px;
      line-height: 1.35;
    }
    .sheet {
      width: 100%;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .logo-img {
      height: 48px;
      max-width: 220px;
      object-fit: contain;
    }
    .company-title {
      font-size: 14px;
      font-weight: 900;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-sub {
      font-size: 9.5px;
      font-weight: 700;
      margin: 2px 0 0 0;
      color: #000;
    }
    .company-address {
      font-size: 8.5px;
      margin: 2px 0 0 0;
      color: #222;
    }
    .form-box {
      border: 1.5px solid #000;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 900;
      display: inline-block;
      text-align: center;
    }
    .doc-title {
      text-align: center;
      margin: 10px 0 12px 0;
    }
    .doc-title h2 {
      font-size: 13px;
      font-weight: 900;
      margin: 0;
      text-transform: uppercase;
      text-decoration: underline;
      letter-spacing: 0.5px;
    }
    .doc-title p {
      font-size: 10px;
      margin: 4px 0 0 0;
    }
    .section-box {
      border: 1.5px solid #000;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .section-header {
      background: #fff;
      border-bottom: 1.5px solid #000;
      padding: 4px 8px;
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-body {
      padding: 8px;
    }
    table.data-grid {
      width: 100%;
      border-collapse: collapse;
    }
    table.data-grid td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 10.5px;
    }
    .label {
      font-size: 8.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #333;
      display: block;
      margin-bottom: 2px;
    }
    .val {
      font-weight: bold;
      color: #000;
    }
    .val-normal {
      font-weight: normal;
      color: #000;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .sign-col {
      width: 33.33%;
      border: 1.5px solid #000;
      padding: 8px 6px;
      text-align: center;
      vertical-align: top;
    }
    .qr-frame {
      width: 90px;
      height: 90px;
      margin: 8px auto;
      border: 1px solid #000;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    .qr-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .footer-note {
      margin-top: 14px;
      border-top: 1px solid #000;
      padding-top: 4px;
      font-size: 8.5px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- KOP RESMI -->
    <table class="header-table">
      <tr>
        <td style="width: 220px; vertical-align: middle;">
          <img src="/yazaki-official-logo.jpg" alt="YAZAKI" class="logo-img" />
        </td>
        <td style="vertical-align: middle; padding-left: 12px;">
          <p class="company-title">PT. JATIM AUTOCOMP INDONESIA</p>
          <p class="company-sub">YAZAKI GROUP · GENERAL AFFAIRS & FLEET MANAGEMENT DIVISION</p>
          <p class="company-address">Kawasan Berikat PT. JAI, Jl. Raya Pasuruan - Mojokerto KM 18, Pasuruan, Jawa Timur</p>
        </td>
        <td style="width: 130px; text-align: right; vertical-align: top;">
          <div class="form-box">FORM-GA-04A</div>
          <div style="font-size: 9px; font-weight: bold; margin-top: 4px; font-family: monospace;">NO: ${trip.id}</div>
        </td>
      </tr>
    </table>

    <!-- JUDUL SURAT -->
    <div class="doc-title">
      <h2>SURAT PERMOHONAN & PERJALANAN DINAS KENDARAAN OPERASIONAL</h2>
      <p>Tanggal Pengajuan: <b>${formattedDate}</b> · Nomor Tiket: <b style="font-family: monospace;">${trip.id}</b></p>
    </div>

    <!-- STATUS DOKUMEN -->
    <div class="section-box">
      <table style="width: 100%; padding: 4px 8px;">
        <tr>
          <td>
            <span class="label">STATUS DOKUMEN:</span>
            <span class="val" style="font-size: 11px;">${getStatusText()}</span>
          </td>
          <td style="text-align: right;">
            <span class="label">KATEGORI:</span>
            <span class="val" style="text-transform: uppercase;">${trip.category}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- I. IDENTITAS PEMOHON -->
    <div class="section-box">
      <div class="section-header">I. IDENTITAS PEMOHON (REQUESTER)</div>
      <div class="section-body">
        <table class="data-grid">
          <tr>
            <td style="width: 30%;">
              <span class="label">Nama Lengkap:</span>
              <span class="val">${trip.requesterName || trip.guest || '-'}</span>
            </td>
            <td style="width: 20%;">
              <span class="label">NIK Pemohon:</span>
              <span class="val" style="font-family: monospace;">${trip.requesterNik || '—'}</span>
            </td>
            <td style="width: 25%;">
              <span class="label">Departemen:</span>
              <span class="val">${trip.dept}</span>
            </td>
            <td style="width: 25%;">
              <span class="label">Section / Bagian:</span>
              <span class="val">${trip.section || 'Seluruh Departemen'}</span>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- II. RINCIAN PERJALANAN -->
    <div class="section-box">
      <div class="section-header">II. RINCIAN TUJUAN & JADWAL PERJALANAN</div>
      <div class="section-body">
        <table class="data-grid">
          <tr>
            <td style="width: 50%;">
              <span class="label">Titik Keberangkatan (Origin):</span>
              <span class="val">${trip.origin || 'PT. JAI Pasuruan'}</span>
            </td>
            <td style="width: 25%;">
              <span class="label">Tanggal Berangkat:</span>
              <span class="val">${formattedDate}</span>
            </td>
            <td style="width: 25%;">
              <span class="label">Estimasi Waktu:</span>
              <span class="val">${trip.estDeparture} ${trip.estReturn ? `– ${trip.estReturn}` : ''} WIB</span>
            </td>
          </tr>
          <tr>
            <td style="width: 50%;">
              <span class="label">Tujuan Utama / Rute:</span>
              <span class="val" style="font-size: 11px;">${trip.destination}</span>
              ${trip.destinations && trip.destinations.length > 1 ? `<div style="font-size: 9px; margin-top: 3px; color: #222;">Multi-Drop: ${trip.destinations.join(' → ')}</div>` : ''}
            </td>
            <td style="width: 25%;">
              <span class="label">Estimasi Jarak Tempuh:</span>
              <span class="val">${trip.distance_km ? `${trip.distance_km} KM (${trip.returnToOrigin ? 'PP' : 'Sekali Jalan'})` : '—'}</span>
            </td>
            <td style="width: 25%;">
              <span class="label">Estimasi Durasi:</span>
              <span class="val">${trip.estimated_duration_minutes ? `~${trip.estimated_duration_minutes} Menit` : '—'}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              <span class="label">Keperluan / Alasan Kunjungan:</span>
              <div style="border: 1px solid #000; padding: 4px; font-weight: 500; min-height: 28px;">
                ${trip.purpose}
              </div>
            </td>
            <td>
              <span class="label">Alokasi Armada & Sopir:</span>
              <div style="border: 1px solid #000; padding: 4px;">
                <span class="val" style="display: block;">${trip.plate || 'Belum Ditugaskan'}</span>
                <span style="font-size: 9px; font-weight: bold;">${trip.driverId ? `Driver: ${trip.driverId}` : 'Pool GA'}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="padding-top: 6px;">
              <span class="label">Daftar Penumpang yang Berangkat:</span>
              <div style="font-weight: 500;">
                ${trip.driverOnly ? 'Hanya Driver (Driver Only - Tanpa Penumpang)' : (
                  (!trip.passengers || trip.passengers.length === 0)
                    ? `1. ${trip.requesterName || trip.guest} (NIK: ${trip.requesterNik || '—'}, Dept: ${trip.dept})`
                    : trip.passengers.map((p, idx) => `${idx + 1}. ${p.name} (NIK: ${p.nik || '—'}, Dept: ${p.dept || trip.dept})`).join(' &nbsp;|&nbsp; ')
                )}
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- III. LEMBAR PENGESAHAN & QR E-SIGN -->
    <div style="margin-top: 8px;">
      <div style="text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">
        III. LEMBAR PENGESAHAN & TANDA TANGAN DIGITAL (E-SIGN)
      </div>
      <p style="text-align: center; font-size: 8.5px; margin: 0 0 6px 0; color: #333;">
        Scan kode QR di bawah menggunakan kamera HP atau Google Lens untuk verifikasi online keabsahan tanda tangan elektronik.
      </p>

      <table class="sign-table">
        <tr>
          <!-- Kolom 1: Pemohon -->
          <td class="sign-col">
            <span class="label">Diajukan Oleh</span>
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">Pemohon (Requester)</div>
            <div class="qr-frame">
              ${spvQrCodeUrl ? `<img src="${spvQrCodeUrl}" alt="QR" />` : '<div style="font-size: 8px;">Terkirim</div>'}
            </div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 4px;">Status: Terkirim</div>
            <div style="border-top: 1px solid #000; margin-top: 4px; padding-top: 3px;">
              <div class="val" style="font-size: 10px;">${trip.requesterName || trip.guest}</div>
              <div style="font-size: 8.5px; font-family: monospace;">NIK: ${trip.requesterNik || '—'}</div>
            </div>
          </td>

          <!-- Kolom 2: Approver 1 -->
          <td class="sign-col">
            <span class="label">Persetujuan Tahap 1</span>
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">SPV / Manager Dept</div>
            <div class="qr-frame">
              ${spvQrCodeUrl
                ? `<img src="${spvQrCodeUrl}" alt="QR E-Sign Approver 1" />`
                : (trip.status === 'REJECTED'
                    ? '<div style="font-size: 9px; font-weight: bold; color: red;">Ditolak</div>'
                    : '<div style="font-size: 8.5px; font-weight: bold;">Menunggu<br>Persetujuan</div>')}
            </div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 4px;">
              ${spvQrCodeUrl ? '✓ Terverifikasi E-Sign' : 'Tahap 1 Pending'}
            </div>
            <div style="border-top: 1px solid #000; margin-top: 4px; padding-top: 3px;">
              <div class="val" style="font-size: 10px;">${trip.spvName || 'SPV / Manager'}</div>
              <div style="font-size: 8.5px;">${trip.dept} Dept.</div>
            </div>
          </td>

          <!-- Kolom 3: Approver 2 -->
          <td class="sign-col">
            <span class="label">Persetujuan Tahap 2</span>
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">SPV Kendaraan (Pool GA)</div>
            <div class="qr-frame">
              ${poolQrCodeUrl
                ? `<img src="${poolQrCodeUrl}" alt="QR E-Sign Approver 2" />`
                : (trip.status === 'REJECTED'
                    ? '<div style="font-size: 9px; font-weight: bold; color: red;">Ditolak</div>'
                    : '<div style="font-size: 8.5px; font-weight: bold;">Menunggu<br>Verifikasi</div>')}
            </div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 4px;">
              ${poolQrCodeUrl ? '✓ Terverifikasi E-Sign' : 'Tahap 2 Pending'}
            </div>
            <div style="border-top: 1px solid #000; margin-top: 4px; padding-top: 3px;">
              <div class="val" style="font-size: 10px;">${trip.poolSpvName || 'Hayu Prasetyo Utomo'}</div>
              <div style="font-size: 8.5px;">SPV Kendaraan & Pool GA</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- FOOTER -->
    <div class="footer-note">
      <span>Dicetak secara otomatis melalui JAI-FLEET System · PT. Jatim Autocomp Indonesia</span>
      <span style="font-weight: bold;">Halaman 1 dari 1 · Form Sah Operasional</span>
    </div>
  </div>
</body>
</html>`
  }

  // Handle Cetak via Iframe Terisolasi (Print Preview 100% Berisi & Anti-Blank)
  const handlePrint = () => {
    try {
      let iframe = printIframeRef.current
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        document.body.appendChild(iframe)
        printIframeRef.current = iframe
      }

      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(generateFormalPrintHtml())
        doc.close()

        setTimeout(() => {
          iframe?.contentWindow?.focus()
          iframe?.contentWindow?.print()
        }, 350)
      } else {
        window.print()
      }
    } catch (e) {
      console.error('Print iframe error, fallback to window.print:', e)
      window.print()
    }
  }

  // Handle Download Langsung File PDF Menggunakan jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const html2canvasModule = await import('html2canvas')
      const jsPDFModule = await import('jspdf')
      const html2canvas = html2canvasModule.default || html2canvasModule
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default

      // Buat container tersembunyi khusus render HTML formal
      const renderContainer = document.createElement('div')
      renderContainer.style.position = 'fixed'
      renderContainer.style.left = '-9999px'
      renderContainer.style.top = '0'
      renderContainer.style.width = '800px'
      renderContainer.style.background = '#ffffff'
      renderContainer.style.color = '#000000'
      renderContainer.style.padding = '20px'
      renderContainer.innerHTML = generateFormalPrintHtml()
      document.body.appendChild(renderContainer)

      // Render ke Canvas dengan skala resolusi tinggi
      const canvas = await html2canvas(renderContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      document.body.removeChild(renderContainer)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, 295))
      pdf.save(`SURAT_PENGESAHAN_KENDARAAN_${trip.id}.pdf`)
    } catch (err) {
      console.error('Failed to generate PDF directly, falling back to print preview:', err)
      handlePrint()
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#081f14] shadow-2xl border border-white/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white font-sans print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-auto">
        {/* CSS Khusus Cetak Standar Jaga-jaga */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #web-summary-card, #web-summary-card * {
                visibility: visible !important;
              }
              #web-summary-card {
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

        {/* Modal Topbar */}
        <div className="no-print flex items-center justify-between border-b border-white/10 bg-[#06180f] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#a3e635] text-[#052e16] shadow-md font-bold">
              <FileText size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Laporan Summary Pengajuan Kendaraan</h3>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs font-black text-[#a3e635]">
                  {trip.id}
                </span>
              </div>
              <p className="text-xs text-[#8fa99b]">
                Tampilan interaktif web bernuansa sistem & berkas unduhan PDF hitam-putih formal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#a3e635] bg-[#a3e635] hover:bg-[#bef264] text-[#052e16] px-4 py-2 text-xs font-black shadow-md transition hover:scale-[1.02] disabled:opacity-50"
              title="Download Dokumen PDF Formal Hitam-Putih"
            >
              {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="stroke-[2.5]" />}
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition"
              title="Cetak Dokumen (Ctrl+P)"
            >
              <Printer size={15} />
              <span>Cetak</span>
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

        {/* Modal Scrollable Canvas: Tampilan Web Berwarna Indah Sesuai Background Sistem */}
        <div className="flex-1 overflow-y-auto bg-black/40 p-4 sm:p-6">
          <div
            id="web-summary-card"
            ref={printAreaRef}
            className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 sm:p-8 shadow-2xl text-white space-y-4"
          >
            {/* 1. KOP SURAT RESMI DI WEB DENGAN LOGO ASLI YAZAKI & IDENTITAS LENGKAP */}
            <div className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="rounded-xl bg-white p-2 shadow-sm border border-white/20 flex items-center justify-center">
                    <img
                      src="/yazaki-official-logo.jpg"
                      alt="YAZAKI PT. JATIM AUTOCOMP INDONESIA"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                      PT. JATIM AUTOCOMP INDONESIA
                    </h1>
                    <p className="text-xs font-semibold text-[#a3e635] uppercase tracking-wide">
                      YAZAKI GROUP · GENERAL AFFAIRS & FLEET MANAGEMENT DIVISION
                    </p>
                    <p className="text-[10px] text-[#8fa99b]">
                      Kawasan Berikat PT. JAI, Jl. Raya Pasuruan - Mojokerto KM 18, Pasuruan, Jawa Timur
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/15 px-3 py-1 font-mono text-xs font-black text-[#bef264]">
                    FORM-GA-04A
                  </span>
                  <p className="mt-1 font-mono text-[11px] font-bold text-[#8fa99b]">NO: {trip.id}</p>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white underline decoration-[#a3e635] decoration-2 underline-offset-4">
                  SURAT PERMOHONAN & PERJALANAN DINAS KENDARAAN OPERASIONAL
                </h2>
                <p className="mt-1 text-xs text-[#8fa99b]">
                  Tanggal Pengajuan: <strong className="text-white font-bold">{formattedDate}</strong> · Nomor Tiket:{' '}
                  <span className="font-mono font-black text-[#a3e635]">{trip.id}</span>
                </p>
              </div>
            </div>

            {/* 2. STATUS PENGAJUAN (BERWARNA INDAH) */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#a3e635] animate-pulse" />
                <div>
                  <span className="font-bold uppercase text-[10px] block text-[#8fa99b]">STATUS DOKUMEN:</span>
                  <strong className="text-sm font-black text-[#bef264]">{getStatusText()}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold uppercase text-[10px] block text-[#8fa99b]">KATEGORI:</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white uppercase">
                  {trip.category}
                </span>
              </div>
            </div>

            {/* 3. IDENTITAS PEMOHON */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#bef264] border-b border-white/10 pb-2 mb-3 flex items-center gap-1.5">
                <User size={14} className="text-[#a3e635]" /> I. IDENTITAS PEMOHON (REQUESTER)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Nama Lengkap:</span>
                  <span className="font-black text-sm text-white">
                    {trip.requesterName || trip.guest || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">NIK Pemohon:</span>
                  <span className="font-mono font-bold text-white">
                    {trip.requesterNik || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Departemen:</span>
                  <span className="font-bold text-white">{trip.dept}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Section / Bagian:</span>
                  <span className="font-bold text-white">{trip.section || 'Seluruh Departemen'}</span>
                </div>
              </div>
            </div>

            {/* 4. RINCIAN TUJUAN & JADWAL PERJALANAN */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#bef264] border-b border-white/10 pb-2 mb-3 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#a3e635]" /> II. RINCIAN TUJUAN & JADWAL PERJALANAN
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Titik Awal (Origin):</span>
                    <span className="font-bold text-white">{trip.origin || 'PT. JAI Pasuruan'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Tujuan Utama / Rute:</span>
                    <span className="font-black text-[#a3e635] text-sm">{trip.destination}</span>
                    {trip.destinations && trip.destinations.length > 1 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {trip.destinations.map((d, i) => (
                          <span key={i} className="rounded bg-white/10 border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Stop {i + 1}: {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Keperluan / Alasan Kunjungan:</span>
                    <p className="font-medium text-white border border-white/10 bg-black/30 p-2.5 rounded-lg leading-relaxed">
                      {trip.purpose}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:border-l sm:border-white/10 sm:pl-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Tanggal Berangkat:</span>
                      <span className="font-bold text-white">{formattedDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Estimasi Waktu:</span>
                      <span className="font-bold text-white">
                        {trip.estDeparture} {trip.estReturn ? `– ${trip.estReturn}` : ''} WIB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Estimasi Jarak Tempuh:</span>
                      <span className="font-bold text-white">
                        {trip.distance_km ? `${trip.distance_km} KM (${trip.returnToOrigin ? 'PP' : 'Sekali Jalan'})` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Estimasi Durasi:</span>
                      <span className="font-bold text-white">
                        {trip.estimated_duration_minutes ? `~${trip.estimated_duration_minutes} Menit` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Alokasi Driver & Plat */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Alokasi Armada & Pengemudi:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-black text-[#bef264]">
                        {trip.plate || 'Belum Ditugaskan (Menunggu Verifikasi)'}
                      </span>
                      <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                        {trip.driverId ? `Driver: ${trip.driverId}` : 'Pool GA'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rombongan Penumpang */}
              <div className="mt-4 border-t border-white/10 pt-3">
                <span className="text-[10px] font-black uppercase text-[#bef264] block mb-2">
                  Daftar Penumpang yang Berangkat ({trip.driverOnly ? '0 Orang - Hanya Driver' : `${trip.passengers && trip.passengers.length > 0 ? trip.passengers.length : 1} Orang`}):
                </span>

                {trip.driverOnly ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 italic">
                    Kendaraan berjalan tanpa penumpang (keperluan distribusi barang / dokumen pabrik).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(!trip.passengers || trip.passengers.length === 0) ? (
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
                        <span className="flex size-5 items-center justify-center rounded-full bg-[#a3e635] text-[10px] font-black text-[#052e16]">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-white">{trip.requesterName || trip.guest}</p>
                          <p className="text-[10px] text-[#8fa99b]">NIK: {trip.requesterNik || '—'} · Dept: {trip.dept}</p>
                        </div>
                      </div>
                    ) : (
                      trip.passengers.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
                          <span className="flex size-5 items-center justify-center rounded-full bg-[#a3e635] text-[10px] font-black text-[#052e16]">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-bold text-white truncate">{p.name}</p>
                            <p className="text-[10px] text-[#8fa99b] truncate">NIK: {p.nik || '—'} · Dept: {p.dept || trip.dept}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. PETA RUTE KESELURUHAN (WEB VIEW) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#bef264] flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#a3e635]" /> III. PETA RUTE PERJALANAN (GENERAL OVERVIEW)
                </h4>
                {trip.distance_km && (
                  <span className="font-mono text-xs font-black text-[#a3e635]">
                    Total Jarak: {trip.distance_km} KM
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 h-[220px]">
                <TripRouteMap
                  destinations={trip.destinations}
                  destination={trip.destination}
                  height={220}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#8fa99b] italic text-center">
                *Visualisasi koordinat rute keberangkatan & titik tujuan resmi armada PT. JAI.
              </p>
            </div>

            {/* 6. LEMBAR PENGESAHAN & QR CODE SIMPEL STYLE */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-white text-center mb-1">
                IV. LEMBAR PENGESAHAN & TANDA TANGAN DIGITAL (E-SIGN)
              </h4>
              <p className="text-[11px] text-[#8fa99b] text-center mb-4 max-w-lg mx-auto">
                Scan kode QR di bawah menggunakan kamera HP atau Google Lens untuk membuka halaman verifikasi keabsahan dokumen tanda tangan elektronik.
              </p>

              {/* 3 Kolom Tanda Tangan */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Kolom 1: Pemohon */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8fa99b] block">Diajukan Oleh</span>
                    <span className="text-xs font-bold text-white">Pemohon (Requester)</span>
                  </div>

                  {/* QR Pemohon */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 rounded-xl border border-white/20 p-1 flex items-center justify-center bg-white shadow-md">
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
                        <div className="text-[9px] text-slate-800 font-bold text-center">
                          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
                          Diajukan
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-[#a3e635] mt-1">Status: Terkirim</span>
                  </div>

                  <div className="border-t border-white/10 pt-1.5">
                    <p className="font-black text-xs text-white truncate" title={trip.requesterName || trip.guest}>
                      {trip.requesterName || trip.guest}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-[#8fa99b]">
                      NIK: {trip.requesterNik || '—'}
                    </p>
                  </div>
                </div>

                {/* Kolom 2: Approver Tahap 1 (SPV / Manager Dept) */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8fa99b] block">Persetujuan Tahap 1</span>
                    <span className="text-xs font-bold text-white">SPV / Manager Dept</span>
                  </div>

                  {/* QR Approver 1 */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 rounded-xl border border-white/20 p-1 flex items-center justify-center bg-white shadow-md">
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
                        <div className="text-[9px] text-rose-600 font-black text-center">
                          <XCircle size={20} className="mx-auto mb-1 text-rose-600" />
                          Ditolak
                        </div>
                      ) : (
                        <div className="text-[9px] text-amber-600 font-bold text-center">
                          <Clock size={20} className="mx-auto mb-1 text-amber-600 animate-spin" />
                          Menunggu
                          <br />
                          Persetujuan
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] mt-1 font-black ${spvQrCodeUrl ? 'text-[#a3e635]' : 'text-slate-400'}`}>
                      {spvQrCodeUrl ? '✓ Terverifikasi' : 'Tahap 1 Pending'}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-1.5">
                    <p className="font-black text-xs text-white truncate" title={trip.spvName}>
                      {trip.spvName || 'SPV / Manager'}
                    </p>
                    <p className="text-[10px] font-bold text-[#8fa99b]">
                      {trip.dept} Dept.
                    </p>
                  </div>
                </div>

                {/* Kolom 3: Approver Tahap 2 (SPV Kendaraan / Pool GA) */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between h-[240px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8fa99b] block">Persetujuan Tahap 2</span>
                    <span className="text-xs font-bold text-white">SPV Kendaraan (Pool GA)</span>
                  </div>

                  {/* QR Approver 2 */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="size-24 rounded-xl border border-white/20 p-1 flex items-center justify-center bg-white shadow-md">
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
                        <div className="text-[9px] text-rose-600 font-black text-center">
                          <XCircle size={20} className="mx-auto mb-1 text-rose-600" />
                          Ditolak
                        </div>
                      ) : (
                        <div className="text-[9px] text-amber-600 font-bold text-center">
                          <Clock size={20} className="mx-auto mb-1 text-amber-600 animate-spin" />
                          Menunggu
                          <br />
                          Verifikasi Armada
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] mt-1 font-black ${poolQrCodeUrl ? 'text-[#a3e635]' : 'text-slate-400'}`}>
                      {poolQrCodeUrl ? '✓ Terverifikasi' : 'Tahap 2 Pending'}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-1.5">
                    <p className="font-black text-xs text-white truncate" title={trip.poolSpvName || 'Hayu Prasetyo Utomo'}>
                      {trip.poolSpvName || 'Hayu Prasetyo Utomo'}
                    </p>
                    <p className="text-[10px] font-bold text-[#8fa99b]">
                      SPV Kendaraan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Dokumen Web */}
            <div className="mt-8 border-t border-white/10 pt-3 text-[10px] text-[#8fa99b] flex items-center justify-between">
              <span>Dicetak secara otomatis melalui JAI-FLEET System · PT. Jatim Autocomp Indonesia</span>
              <span className="font-bold text-white">Form Sah Operasional</span>
            </div>
          </div>
        </div>

        {/* Modal Pop-up Rincian Scan QR Code */}
        {selectedQrDetail && (
          <div className="no-print absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0a2418] p-6 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[#a3e635] text-[#052e16] font-bold">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{selectedQrDetail.title}</h4>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#a3e635]">
                      {selectedQrDetail.stage}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQrDetail(null)}
                  className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="border border-white/10 bg-black/40 rounded-xl p-4 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Nama Penandatangan (Approver):</span>
                  <span className="text-sm font-black text-white">{selectedQrDetail.approverName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Jabatan / Otoritas:</span>
                  <span className="font-bold text-[#bef264]">{selectedQrDetail.approverRole}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Waktu Persetujuan:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedQrDetail.approvedAt || 'Tervalidasi'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b] block">Catatan Approver:</span>
                  <p className="border border-white/10 bg-white/5 rounded-lg p-2 text-white italic">
                    "{selectedQrDetail.notes || 'Disetujui sesuai permohonan.'}"
                  </p>
                </div>
                <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#8fa99b]">URL Verifikasi Online:</span>
                  <a
                    href={selectedQrDetail.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-xs underline flex items-center gap-1 text-[#a3e635] hover:text-[#bef264]"
                  >
                    Buka Link Web <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedQrDetail(null)}
                  className="w-full rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-black text-white transition"
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
