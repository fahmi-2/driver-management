'use client'

import React from 'react'
import {
  FileText,
  User,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Shield,
  Ticket,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react'

export function GuidanceUiMockup({
  contextType,
  title,
  subtitle,
}: {
  contextType?: string
  title?: string
  subtitle?: string
}) {
  switch (contextType) {
    case 'requester_form':
      return (
        <div className="w-full rounded-2xl border border-[#a3e635]/30 bg-[#071d12]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          {/* Header Mockup */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#a3e635]/20 text-[#a3e635]">
                <FileText size={14} />
              </span>
              <span className="font-bold text-white text-xs">Formulir Permohonan Perjalanan</span>
            </div>
            <span className="rounded-full bg-[#a3e635]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#bef264] border border-[#a3e635]/30">
              Kategori: Dinas
            </span>
          </div>

          {/* Form Fields Mini */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
              <span className="text-[#8fa99b] block mb-1 font-medium">Nama Pemohon (Kosong Default)</span>
              <div className="h-6 rounded-lg bg-white/5 border border-white/10 px-2 flex items-center text-white/50 text-[11px] italic">
                Ketik nama pemohon...
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
              <span className="text-[#8fa99b] block mb-1 font-medium">NIK Pemohon</span>
              <div className="h-6 rounded-lg bg-white/5 border border-white/10 px-2 flex items-center text-white/50 text-[11px] italic">
                Ketik NIK...
              </div>
            </div>
          </div>

          {/* Departemen & Approver Preview */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2 text-white">
              <span className="size-2 rounded-full bg-[#a3e635] animate-ping" />
              <span>Departemen: <strong>PGA</strong> · Section: <strong>GAGS</strong></span>
            </div>
            <span className="text-[#a3e635] font-bold">Approver Otomatis: Manager PGA</span>
          </div>

          {/* Destinasi & Tombol */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 space-y-1.5 text-[10px]">
            <div className="flex items-center gap-1.5 text-[#8fa99b]">
              <MapPin size={12} className="text-[#a3e635]" />
              <span>Tujuan: <strong>Surabaya - Kantor Pusat / Vendor</strong></span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-white/60">Jam: 08:00 - 16:00 WIB</span>
              <div className="rounded-lg bg-[#a3e635] text-[#052e16] px-3 py-1 font-bold text-[10px] shadow-sm flex items-center gap-1">
                Kirim Pengajuan <ArrowRight size={10} />
              </div>
            </div>
          </div>
        </div>
      )

    case 'requester_tracking':
      return (
        <div className="w-full rounded-2xl border border-purple-500/30 bg-[#0c1424]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                <Ticket size={14} />
              </span>
              <span className="font-bold text-white text-xs">Tracking Tiket & Notifikasi E-Pass</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              READY (Siap Berangkat)
            </span>
          </div>

          {/* Stepper Status */}
          <div className="grid grid-cols-4 gap-1 text-center text-[9px] pt-1 font-semibold">
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-emerald-300">
              1. Disetujui SPV
            </div>
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-emerald-300">
              2. Dijadwal Pool
            </div>
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-emerald-300">
              3. Otorisasi SPV
            </div>
            <div className="rounded-lg bg-[#a3e635] text-[#052e16] p-1.5 font-bold shadow-md shadow-[#a3e635]/30">
              4. E-Pass Aktif
            </div>
          </div>

          {/* Info Card Tiket */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-[10px] space-y-1.5 text-white">
            <div className="flex justify-between items-center">
              <span className="text-[#8fa99b]">Mobil Operasional:</span>
              <strong className="text-[#a3e635]">Innova Zenix (W 1234 ABC)</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8fa99b]">Supir Ditugaskan:</span>
              <strong className="text-white">Supir Resmi PT. JAI (Standby)</strong>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <span className="text-[#8fa99b]">Izin Keluar Gerbang:</span>
              <span className="text-emerald-400 font-bold">QR / E-Pass Diverifikasi Security</span>
            </div>
          </div>
        </div>
      )

    case 'approver_inbox':
      return (
        <div className="w-full rounded-2xl border border-amber-500/30 bg-[#161b0c]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Shield size={14} />
              </span>
              <span className="font-bold text-white text-xs">Inbox E-Sign Persetujuan Manager</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              Menunggu Approval
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2 text-[10px]">
            <div className="flex items-center justify-between text-white">
              <span>Pemohon: <strong>Staf Dept (PGA / Produksi)</strong></span>
              <span className="text-[#8fa99b]">Tujuan: Kawasan Industri PIER</span>
            </div>
            <p className="text-[#8fa99b] text-[10px] leading-relaxed italic bg-white/5 p-2 rounded-lg border border-white/5">
              "Kunjungan inspeksi rutin dan pengantaran dokumen audit ISO ke rekanan eksternal."
            </p>
          </div>

          {/* Action Buttons E-Sign */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold p-2 text-center text-[10px] flex items-center justify-center gap-1 shadow-sm">
              <CheckCircle2 size={12} /> Setujui Permohonan (E-Sign)
            </div>
            <div className="rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold px-3 py-2 text-center text-[10px]">
              Tolak
            </div>
          </div>
        </div>
      )

    case 'admin_timeline':
      return (
        <div className="w-full rounded-2xl border border-sky-500/30 bg-[#071822]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                <Calendar size={14} />
              </span>
              <span className="font-bold text-white text-xs">Timeline & Penjadwalan Armada (Drag-to-Book)</span>
            </div>
            <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
              Slot 06:00 - 22:00
            </span>
          </div>

          {/* Timeline Mini Matrix */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/10 p-2">
              <span className="w-24 shrink-0 font-bold text-white truncate">Zenix (W 1111)</span>
              <div className="flex-1 h-5 rounded bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-[9px] text-emerald-200 font-semibold">
                Dinas Surabaya (08:00 - 12:00)
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/10 p-2">
              <span className="w-24 shrink-0 font-bold text-white truncate">Reborn (W 2222)</span>
              <div className="flex-1 h-5 rounded bg-sky-500/30 border border-sky-500/50 flex items-center justify-center text-[9px] text-sky-200 font-semibold">
                Tamu Expat Pasuruan (10:00 - 15:00)
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/10 p-2">
              <span className="w-24 shrink-0 font-bold text-white truncate">Avanza (W 3333)</span>
              <div className="flex-1 h-5 rounded border border-dashed border-[#a3e635]/40 bg-[#a3e635]/10 flex items-center justify-center text-[9px] text-[#bef264] font-bold">
                [+] Drag Tiket ke Sini untuk Assign
              </div>
            </div>
          </div>
        </div>
      )

    case 'admin_accounts':
      return (
        <div className="w-full rounded-2xl border border-amber-500/30 bg-[#161208]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Shield size={14} />
              </span>
              <span className="font-bold text-white text-xs">Kelola Data Akun & Akses Pengguna</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              Admin Akses Khusus
            </span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 text-white">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-[#a3e635] text-[#052e16] font-bold flex items-center justify-center text-[9px]">U</div>
                <span><strong>User Requester</strong> · PGA Dept</span>
              </div>
              <span className="text-[#8fa99b] font-mono">•••••••• (Klik Buka Kunci)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 text-white">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-sky-400 text-[#052e16] font-bold flex items-center justify-center text-[9px]">D</div>
                <span><strong>Supir Operasional</strong> · Pool GA</span>
              </div>
              <span className="text-emerald-400 font-bold">Aktif Bertugas</span>
            </div>
          </div>
        </div>
      )

    case 'driver_tasks':
      return (
        <div className="w-full rounded-2xl border border-blue-500/30 bg-[#071324]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                <Truck size={14} />
              </span>
              <span className="font-bold text-white text-xs">Jadwal Tugas Harian Driver (Mobile View)</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Tugas Hari Ini
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2 text-[10px] text-white">
            <div className="flex justify-between items-center">
              <span className="text-[#8fa99b]">Unit Armada:</span>
              <strong className="text-[#a3e635]">Toyota Innova Reborn (W 1928 AB)</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8fa99b]">Jam Keberangkatan:</span>
              <strong className="text-white">08:30 WIB (Standby di Pos Lobby)</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8fa99b]">PIC Penumpang:</span>
              <span className="text-sky-300">Bpk. Daniar (PGA) + 2 Rekan</span>
            </div>
          </div>
        </div>
      )

    case 'security_gate':
      return (
        <div className="w-full rounded-2xl border border-emerald-500/30 bg-[#051c12]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <Shield size={14} />
              </span>
              <span className="font-bold text-white text-xs">Pos Gerbang Security (Gate Clearance)</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              Verifikasi E-Pass Presisi
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 space-y-1.5 text-center">
              <span className="block font-bold text-emerald-300">Tab: Gate Out</span>
              <span className="text-white/70 block text-[9px]">Validasi mobil keluar pabrik</span>
              <div className="rounded-lg bg-emerald-500 text-black font-bold p-1 text-[10px]">
                Validasi Keluar
              </div>
            </div>

            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-2.5 space-y-1.5 text-center">
              <span className="block font-bold text-sky-300">Tab: Gate In</span>
              <span className="text-white/70 block text-[9px]">Catat kedatangan & selesai dinas</span>
              <div className="rounded-lg bg-sky-500 text-black font-bold p-1 text-[10px]">
                Validasi Masuk
              </div>
            </div>
          </div>
        </div>
      )

    case 'coupon_claims':
      return (
        <div className="w-full rounded-2xl border border-purple-500/30 bg-[#140b20]/95 p-4 shadow-xl text-left text-xs space-y-3 font-sans select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                <Ticket size={14} />
              </span>
              <span className="font-bold text-white text-xs">Panel Kupon & Verifikasi Klaim Keuangan</span>
            </div>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
              Kupon Makan / Lembur
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2 text-[10px] text-white">
            <div className="flex justify-between items-center">
              <span>Nomor Tiket: <strong>#TRIP-2026-0819</strong></span>
              <span className="text-purple-300 font-bold">1x Kupon Makan</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[#8fa99b]">Status Pembayaran:</span>
              <div className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-bold text-[9px]">
                PAID (Sudah Dicairkan)
              </div>
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-[#8fa99b]">
          <Info size={16} className="mx-auto mb-1 text-[#a3e635]" />
          Visual panduan antarmuka web
        </div>
      )
  }
}
