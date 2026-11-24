'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  Building,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Mail,
  MapPin,
  Plus,
  Send,
  Settings,
  Trash2,
  User,
  UserCheck,
  Users,
  Loader2,
  Calendar,
  FileText,
} from 'lucide-react'
import { SmtpSettingsModal } from '../smtp-settings-modal'
import { TripEditModal } from '../trip-edit-modal'
import { TripReportSummaryModal } from '../trip-report-summary-modal'
import { ModalPortal } from '../modal-portal'
import { TimeInput24h } from '../time-input-24h'
import {
  DEPARTMENTS,
  DEPARTMENT_APPROVERS,
  getSectionsByDept,
  getApproversBySection,
  getManagerBySection,
  getApproverByGolongan,
  GOLONGAN_OPTIONS,
  type Account,
  type Golongan,
} from '@/lib/accounts'
import {
  COUPON_LABEL,
  STATUS_LABEL,
  fmtDate,
  fmtDur,
  fmtTime,
  ymd,
  useStore,
  type Category,
  type CouponStatus,
  type Passenger,
  type Trip,
} from '@/lib/store'
import {
  Card,
  Empty,
  PageHeader,
  Pill,
  btnGhost,
  btnPrimary,
  couponTone,
  inputCls,
  tdCls,
  thCls,
  tripTone,
  useToast,
} from '../ui-bits'
import { DestinationAutocomplete } from '../destination-autocomplete'
import { TripRouteToggle } from '../route-map'

// Kategori perjalanan resmi (Izin Keluar Lokasi Pabrik resmi dihilangkan)
const CATS: Category[] = ['Dinas', 'Non-Dinas']

export function RequesterForm({ user }: { user: Account }) {
  const { db, createTrip, deleteTrip } = useStore()
  const notify = useToast()
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [summaryTrip, setSummaryTrip] = useState<Trip | null>(null)

  // Kapasitas maksimum kendaraan dari master fleet (default 7 kursi jika belum diset)
  const maxVehicleCapacity = Math.max(7, ...db.vehicles.map((v) => v.capacity || 7))

  // State departemen & section pemohon
  const initialDept = user.dept && DEPARTMENTS.includes(user.dept) ? user.dept : 'PGA'
  const availableSections = getSectionsByDept(initialDept)
  const initialSection = user.section && availableSections.includes(user.section) ? user.section : availableSections[0] || ''
  const initialApprover = getApproverByGolongan(initialDept, initialSection, 1, user.username)

  const [f, setF] = useState({
    date: ymd(), // Tanggal Perjalanan (default hari ini, tidak boleh hari kemarin)
    category: 'Dinas' as Category,
    golongan: 1 as Golongan, // Golongan pemohon utama (1, 2, 3, 4)
    approverRole: initialApprover.approverRole,
    requesterName: '',
    requesterNik: '',
    dept: initialDept,
    section: initialSection,
    approvedBy: initialApprover.name,
    approverEmail: initialApprover.email,
    driverOnly: false, // Opsi "Hanya Driver" (tanpa penumpang / antar barang)
    additionalUsers: [] as Passenger[], // User tambahan yang bertambah saat klik "+ Tambah"
    origin: 'PT. JAI', // Titik awal dinamis
    destination: '',
    destinations: [''] as string[],
    returnToOrigin: true, // Pulang-pergi vs Sekali jalan
    purpose: '',
    estDeparture: '08:00',
    estReturn: '12:00',
    distance_km: undefined as number | undefined,
    estimated_duration_minutes: undefined as number | undefined,
  })

  // Sync approver & email secara realtime jika ada perubahan pada akun di database atau golongan/dept/section
  useEffect(() => {
    const handleAccountsChanged = () => {
      const appr = getApproverByGolongan(f.dept, f.section, f.golongan, user.username)
      setF((prev) => ({
        ...prev,
        approvedBy: appr.name,
        approverEmail: appr.email,
        approverRole: appr.approverRole,
      }))
    }

    handleAccountsChanged()

    window.addEventListener('accounts_updated', handleAccountsChanged)
    window.addEventListener('profile_updated', handleAccountsChanged)
    return () => {
      window.removeEventListener('accounts_updated', handleAccountsChanged)
      window.removeEventListener('profile_updated', handleAccountsChanged)
    }
  }, [f.dept, f.section, f.golongan, user.username])

  // State untuk modal & deteksi akun SMTP pengirim (Hierarki: Akun -> Dept -> Pool GA)
  const [smtpModalOpen, setSmtpModalOpen] = useState(false)
  const [activeSenderSmtp, setActiveSenderSmtp] = useState<{
    isConfigured: boolean
    scope: string
    fromEmail: string
  } | null>(null)

  const loadSenderSmtp = async () => {
    try {
      const res = await fetch(
        `/api/smtp?username=${encodeURIComponent(user.username)}&dept=${encodeURIComponent(f.dept || user.dept || '')}`
      )
      const data = await res.json()
      if (data.ok && data.isConfigured) {
        setActiveSenderSmtp({
          isConfigured: true,
          scope: data.scope,
          fromEmail: data.config?.from || data.config?.user || '',
        })
      } else {
        setActiveSenderSmtp({
          isConfigured: false,
          scope: 'none',
          fromEmail: '',
        })
      }
    } catch {
      // Abaikan error fetch background
    }
  }

  useEffect(() => {
    loadSenderSmtp()
  }, [user.username, f.dept])

  // Total user dalam perjalanan: jika driverOnly = 0 penumpang, jika tidak = 1 + additionalUsers
  const totalUserCount = f.driverOnly ? 0 : 1 + f.additionalUsers.length

  const handleDeptChange = (newDept: string) => {
    const secList = getSectionsByDept(newDept)
    const newSec = secList[0] || ''
    const appr = getApproverByGolongan(newDept, newSec, f.golongan, user.username)
    setF((prev) => ({
      ...prev,
      dept: newDept,
      section: newSec,
      approvedBy: appr.name,
      approverEmail: appr.email,
      approverRole: appr.approverRole,
    }))
  }

  const handleSectionChange = (newSection: string) => {
    const appr = getApproverByGolongan(f.dept, newSection, f.golongan, user.username)
    setF((prev) => ({
      ...prev,
      section: newSection,
      approvedBy: appr.name,
      approverEmail: appr.email,
      approverRole: appr.approverRole,
    }))
  }

  const handleGolonganChange = (newGolongan: Golongan) => {
    const appr = getApproverByGolongan(f.dept, f.section, newGolongan, user.username)
    setF((prev) => ({
      ...prev,
      golongan: newGolongan,
      approvedBy: appr.name,
      approverEmail: appr.email,
      approverRole: appr.approverRole,
    }))
  }

  // Tambah baris user baru (hanya Nama, NIK, dan Departemen - TANPA Approve By)
  const handleAddUser = () => {
    if (totalUserCount >= maxVehicleCapacity) {
      notify(`Maksimal kapasitas kendaraan (${maxVehicleCapacity} orang) telah tercapai!`)
      return
    }

    setF((prev) => ({
      ...prev,
      additionalUsers: [
        ...prev.additionalUsers,
        { name: '', nik: '', dept: prev.dept },
      ],
    }))
  }

  // Update nilai baris user tambahan
  const handleUpdateAdditionalUser = (index: number, field: keyof Passenger, value: string) => {
    setF((prev) => ({
      ...prev,
      additionalUsers: prev.additionalUsers.map((u, idx) =>
        idx === index ? { ...u, [field]: value } : u
      ),
    }))
  }

  // Hapus baris user tambahan
  const handleRemoveAdditionalUser = (index: number) => {
    setF((prev) => ({
      ...prev,
      additionalUsers: prev.additionalUsers.filter((_, i) => i !== index),
    }))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!f.requesterName.trim()) {
      notify('Nama Pemohon wajib diisi!', 'error')
      return
    }
    if (!f.requesterNik.trim()) {
      notify('NIK Pemohon wajib diisi!', 'error')
      return
    }
    if (!f.destination.trim()) {
      notify('Tujuan lokasi wajib diisi!', 'error')
      return
    }

    // Gabungkan pemohon utama dengan user tambahan jika bukan driverOnly
    const allPassengers: Passenger[] = f.driverOnly
      ? []
      : [
        { name: f.requesterName.trim(), nik: f.requesterNik.trim(), dept: f.dept },
        ...f.additionalUsers.filter((u) => u.name.trim()),
      ]

    const guestLabel = f.driverOnly
      ? `Hanya Driver (Kirim Barang / Dokumen oleh ${f.requesterName.trim()})`
      : f.requesterName.trim()

    setIsSubmitting(true)

    try {
      const today = ymd()
      if (f.date && f.date < today) {
        notify('Tanggal perjalanan tidak boleh sebelum hari ini (hari kemarin)!', 'error')
        return
      }

      const res = await createTrip({
        date: f.date || today,
        category: f.category,
        guest: guestLabel,
        requesterNik: f.requesterNik.trim(),
        dept: f.dept,
        section: f.section,
        golongan: f.golongan,
        approverRole: f.approverRole,
        spvName: f.approvedBy || `Approver (${f.dept})`,
        spvEmail: f.approverEmail,
        approverEmail: f.approverEmail,
        passengers: allPassengers,
        driverOnly: f.driverOnly,
        origin: f.origin || 'PT. JAI',
        destination: f.destination,
        destinations: f.destinations.filter(Boolean),
        returnToOrigin: f.returnToOrigin,
        purpose: f.purpose,
        estDeparture: f.estDeparture,
        estReturn: f.estReturn,
        distance_km: f.distance_km,
        estimated_duration_minutes: f.estimated_duration_minutes,
        requesterUser: user.username,
        requesterName: f.requesterName.trim(),
      })

      if (!res.success) {
        const errorMsg = res.error || 'Gagal menyimpan permohonan ke database Supabase.'
        setSubmitError(errorMsg)
        notify(`Gagal Mengajukan: ${errorMsg}`, 'error')
        return
      }

      if (res.emailError) {
        notify(`Pengajuan tersimpan, tetapi email notifikasi GAGAL dikirim: ${res.emailError}`, 'error', 9000)
      } else notify(
        f.driverOnly
          ? `Terkirim (Hanya Driver - Kupon Hangus). Email e-sign dikirim ke ${f.approvedBy} (${f.approverEmail}).`
          : `Terkirim! Permohonan Golongan ${f.golongan} otomatis diarahkan ke ${f.approverRole}: ${f.approvedBy} (${f.approverEmail}) dari Section ${f.section || f.dept}.`
      )

      const resetApprover = getApproverByGolongan(initialDept, initialSection, 1, user.username)
      setF({
        date: ymd(),
        category: 'Dinas',
        golongan: 1,
        approverRole: resetApprover.approverRole,
        requesterName: '',
        requesterNik: '',
        dept: initialDept,
        section: initialSection,
        approvedBy: resetApprover.name,
        approverEmail: resetApprover.email,
        driverOnly: false,
        additionalUsers: [],
        origin: 'PT. JAI',
        destination: '',
        destinations: [''],
        returnToOrigin: true,
        purpose: '',
        estDeparture: '08:00',
        estReturn: '12:00',
        distance_km: undefined,
        estimated_duration_minutes: undefined,
      })
      setSubmitError(null)
    } catch (err: any) {
      const errMsg = err?.message || 'Terjadi kesalahan sistem saat memproses pengajuan.'
      setSubmitError(errMsg)
      notify(errMsg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const mine = db.trips.filter((t) => t.requesterUser === user.username).slice().reverse()
  const availableSectionsForDept = getSectionsByDept(f.dept)
  const currentApprovers = getApproversBySection(f.dept, f.section)

  // Sub menu navigasi atas: 'form' (Formulir Permohonan) atau 'history' (Riwayat Pengajuan)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')

  return (
    <>
      <PageHeader
        title="Ajukan Kendaraan"
        desc="Pengajuan permohonan perjalanan pool armada pabrik PT. JAI dengan approval berjenjang."
        action={
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/40 border border-white/10 p-1.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'form'
                ? 'bg-[#a3e635] text-[#052e16] shadow-md shadow-[#a3e635]/25 scale-[1.02]'
                : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
                }`}
            >
              <Plus size={15} />
              Formulir Pengajuan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'history'
                ? 'bg-[#a3e635] text-[#052e16] shadow-md shadow-[#a3e635]/25 scale-[1.02]'
                : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
                }`}
            >
              <Users size={15} />
              Riwayat Pengajuan
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${activeTab === 'history'
                  ? 'bg-[#052e16] text-[#bef264]'
                  : 'bg-white/10 text-white'
                  }`}
              >
                {mine.length}
              </span>
            </button>
          </div>
        }
      />

      {activeTab === 'form' && (
        <Card
          title="Formulir Permohonan Perjalanan"
          subtitle="Isi rincian keperluan perjalanan dinas & operasional PT. JAI (Tampilan Penuh)"
        >
          <form onSubmit={submit} className="grid gap-4.5 p-6">
            {/* 1. Kategori / Pilihan Keperluan (Hanya Dinas & Non-Dinas) */}
            <div>
              <p className="text-xs font-semibold text-[#8fa99b]">Kategori / Jenis Perjalanan</p>
              <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
                {CATS.map((c, i) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setF({ ...f, category: c })}
                    className={`rounded-xl border px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${f.category === c
                      ? 'border-[#a3e635] bg-[#a3e635]/20 text-white ring-1 ring-[#a3e635]/40 shadow-xs'
                      : 'border-[#a3e635]/20 bg-white/[0.03] text-[#8fa99b] hover:bg-[#a3e635]/10'
                      }`}
                  >
                    <span className="size-2 rounded-full bg-[#a3e635]" />
                    {i + 1}. {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pengisian Data Pemohon & Approver */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User size={14} className="text-[#a3e635]" /> Data Pemohon & Penerima Persetujuan
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <User size={11} className="text-[#a3e635]" />
                    Akun Pengaju: <strong className="text-white">{user.name}</strong> ({user.email || 'Email belum terdaftar'})
                  </span>
                  <span className="rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#bef264]">
                    {totalUserCount} / {maxVehicleCapacity} Orang (Termasuk Pemohon)
                  </span>
                </div>
              </div>

              {/* Grid 5 Kolom: Nama Pemohon, NIK, Golongan (Wajib baris teratas), Departemen, Section */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Nama Pemohon <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    value={f.requesterName}
                    onChange={(e) => setF({ ...f, requesterName: e.target.value })}
                    placeholder="Nama Lengkap Pemohon"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    NIK Pemohon <span className="text-[#a3e635]">*Wajib</span>
                  </label>
                  <input
                    value={f.requesterNik}
                    onChange={(e) => setF({ ...f, requesterNik: e.target.value })}
                    placeholder="Nomor Induk Karyawan"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Golongan <span className="text-[#a3e635]">*Wajib (Alur Approval)</span>
                  </label>
                  <select
                    value={f.golongan}
                    onChange={(e) => handleGolonganChange(Number(e.target.value) as Golongan)}
                    className={`${inputCls} bg-black/40 font-bold text-[#bef264]`}
                    required
                  >
                    {GOLONGAN_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-[#0f1f17] text-white">
                        Golongan {g} {g === 4 ? '(→ Manager)' : '(→ SSPV)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Departemen <span className="text-[#a3e635]">*Pilih</span>
                  </label>
                  <select
                    value={f.dept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className={`${inputCls} bg-black/40`}
                    required
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#0f1f17] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1">
                    Section (Bagian) <span className="text-[#a3e635]">*Filter Otomatis</span>
                  </label>
                  <select
                    value={f.section}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className={`${inputCls} bg-black/40 truncate`}
                    required
                  >
                    {availableSectionsForDept.map((sec) => (
                      <option key={sec} value={sec} className="bg-[#0f1f17] text-white">
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Banner Info Approver Otomatis Sesuai Rule Golongan (SSPV vs Manager) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-[#a3e635]/30 bg-[#a3e635]/10 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-[#e2f8d8]">
                  <Mail size={14} className="text-[#a3e635] shrink-0" />
                  <span>
                    Approval Tahap 1 ({f.approverRole}) Ditujukan ke:{' '}
                    <strong className="text-white">{f.approvedBy || `${f.approverRole} ${f.dept}`}</strong>{' '}
                    <span className="font-mono text-[#bef264]">({f.approverEmail || 'Email terdaftar'})</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-block rounded-md bg-[#052e16] px-2.5 py-0.5 text-[10px] font-extrabold text-[#bef264] border border-[#a3e635]/40">
                    {f.golongan === 4 ? 'Golongan 4 → Bypass ke Manager' : `Golongan ${f.golongan} → SSPV Section`}
                  </span>
                </div>
              </div>

              {/* Banner Info Pengirim Email (SMTP Departemen / Akun) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-sky-500/30 bg-sky-950/20 px-3.5 py-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-sky-200">
                  <Send size={15} className="text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">Email Pengirim Notifikasi:</span>
                      {activeSenderSmtp?.isConfigured ? (
                        <span className="font-mono text-sky-300 font-semibold bg-sky-900/40 px-2 py-0.5 rounded border border-sky-400/20">
                          {activeSenderSmtp.fromEmail}
                        </span>
                      ) : (
                        <span className="text-amber-300 italic text-[11px]">
                          Belum disetel khusus (menggunakan fallback Pool GA)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-sky-300/75">
                      Sumber:{' '}
                      <strong className="text-white">
                        {activeSenderSmtp?.scope === 'account'
                          ? `Akun Pribadi (${user.name})`
                          : activeSenderSmtp?.scope === 'dept'
                            ? `Departemen ${f.dept}`
                            : activeSenderSmtp?.scope === 'global'
                              ? 'Pool GA Pusat (Global)'
                              : 'Default Server'}
                      </strong>
                      {' — '}Email persetujuan akan dikirim atas nama departemen Anda ke Manager terkait.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSmtpModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/20 hover:bg-sky-500/30 px-3 py-1.5 text-[11px] font-bold text-sky-200 transition shrink-0 shadow-xs"
                >
                  <Settings size={13} className="text-sky-300" />
                  Atur SMTP Departemen / Akun
                </button>
              </div>

              {/* Opsi "Hanya Driver" (Kirim Barang / Dokumen tanpa penumpang) */}
              <div
                className={`rounded-xl border p-3.5 transition ${f.driverOnly
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/30'
                  : 'border-white/10 bg-white/[0.02] text-[#8fa99b] hover:bg-white/[0.04]'
                  }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={f.driverOnly}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setF((prev) => ({
                        ...prev,
                        driverOnly: checked,
                        // Kosongkan user tambahan jika beralih ke hanya driver
                        additionalUsers: checked ? [] : prev.additionalUsers,
                      }))
                    }}
                    className="mt-0.5 size-4 rounded border-white/20 bg-black/40 text-[#a3e635] accent-[#a3e635] focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Opsi "Hanya Driver" (Tanpa Penumpang)
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${f.driverOnly
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-white/10 text-[#8fa99b]'
                          }`}
                      >
                        {f.driverOnly ? 'Kupon Makan VOID / Hangus' : 'Kupon Normal'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#93a097]">
                      Centang jika hanya menugaskan sopir untuk mengambil / mengirim dokumen atau barang logistik pabrik tanpa ada karyawan/tamu yang ikut.
                    </p>
                    {f.driverOnly && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200">
                        <AlertCircle size={14} className="shrink-0 text-amber-300" />
                        <span>
                          <strong>Konsekuensi Sistem:</strong> Hak klaim kupon makan siang driver untuk pengajuan ini <strong>otomatis dinonaktifkan (VOID / Hangus)</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* User Tambahan (Hanya muncul jika BUKAN "Hanya Driver") */}
              {!f.driverOnly && f.additionalUsers.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <p className="text-[11px] font-bold text-[#bef264] flex items-center gap-1.5">
                    <Users size={13} className="text-[#a3e635]" /> User / Penumpang Tambahan ({f.additionalUsers.length})
                  </p>

                  <div className="space-y-2.5">
                    {f.additionalUsers.map((u, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2 transition hover:border-white/15"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#bef264]">
                            <span className="flex size-4.5 items-center justify-center rounded-full bg-[#a3e635]/20 text-[9px] text-[#bef264]">
                              +{idx + 1}
                            </span>
                            User Tambahan {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalUser(idx)}
                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>

                        {/* Hanya Nama, NIK, dan Departemen (TIDAK ADA APPROVE BY) */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              Nama Lengkap <span className="text-[#a3e635]">*</span>
                            </label>
                            <input
                              type="text"
                              value={u.name}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'name', e.target.value)}
                              placeholder="Nama rekan kerja"
                              className={inputCls}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              NIK <span className="text-[#a3e635]">*</span>
                            </label>
                            <input
                              type="text"
                              value={u.nik || ''}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'nik', e.target.value)}
                              placeholder="NIK rekan kerja"
                              className={`${inputCls} font-mono`}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#8fa99b] mb-1">
                              Departemen <span className="text-[#a3e635]">*</span>
                            </label>
                            <select
                              value={u.dept}
                              onChange={(e) => handleUpdateAdditionalUser(idx, 'dept', e.target.value)}
                              className={`${inputCls} bg-black/40`}
                              required
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d} className="bg-[#0f1f17] text-white">
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Tambah User (Dinonaktifkan jika mode Hanya Driver) */}
              {!f.driverOnly && totalUserCount < maxVehicleCapacity && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddUser}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#a3e635]/40 bg-[#a3e635]/5 px-3.5 py-2 text-xs font-bold text-[#bef264] hover:bg-[#a3e635]/15 hover:border-[#a3e635] transition"
                  >
                    <Plus size={14} />
                    Tambah Rekan / User ({totalUserCount + 1}/{maxVehicleCapacity})
                  </button>
                </div>
              )}
            </div>

            {/* 5. Fitur Rute Multi-Drop & Integrasi Peta PT. JAI */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8fa99b]">
                Rute Perjalanan (Multi-Drop)
              </label>
              <DestinationAutocomplete
                origin={f.origin}
                value={f.destination}
                destinations={f.destinations}
                returnToOrigin={f.returnToOrigin}
                distanceKm={f.distance_km}
                durationMins={f.estimated_duration_minutes}
                onChange={(data) => {
                  setF((prev) => ({
                    ...prev,
                    origin: data.origin,
                    destination: data.destination,
                    destinations: data.destinations,
                    returnToOrigin: data.returnToOrigin ?? true,
                    distance_km: data.distance_km,
                    estimated_duration_minutes: data.estimated_duration_minutes,
                  }))
                }}
              />
            </div>

            {/* 6. Keperluan / Alasan Kunjungan */}
            <label className="text-xs font-semibold text-[#8fa99b]">
              Keperluan / Alasan Kunjungan
              <input
                value={f.purpose}
                onChange={(e) => setF({ ...f, purpose: e.target.value })}
                placeholder="Contoh: Survey vendor / Pengiriman sampel part pabrik"
                className={inputCls}
                required
              />
            </label>

            {/* 7. Tanggal Perjalanan, Estimasi Jam Berangkat & Estimasi Jam Kembali */}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-[#8fa99b]">
                <span className="flex items-center gap-1.5 mb-1">
                  <Calendar size={13} className="text-[#a3e635]" />
                  Tanggal Perjalanan <span className="text-[#a3e635]">*</span>
                </span>
                <input
                  type="date"
                  min={ymd()}
                  value={f.date}
                  onChange={(e) => setF({ ...f, date: e.target.value })}
                  className={`${inputCls} font-mono`}
                  required
                />
              </label>

              <label className="text-xs font-semibold text-[#8fa99b]">
                Estimasi Jam Berangkat
                <TimeInput24h
                  value={f.estDeparture}
                  onChange={(val) => setF({ ...f, estDeparture: val })}
                  className={inputCls}
                  required
                />
              </label>

              <label className="text-xs font-semibold text-[#8fa99b]">
                Estimasi Jam Kembali
                <TimeInput24h
                  value={f.estReturn}
                  onChange={(val) => setF({ ...f, estReturn: val })}
                  className={inputCls}
                  required
                />
              </label>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-rose-300">Gagal Mengajukan Perjalanan</p>
                    <p className="font-mono text-[11px] text-rose-200/90 leading-relaxed bg-black/40 p-2.5 rounded-lg border border-rose-500/20 break-words">
                      {submitError}
                    </p>
                    {submitError.toLowerCase().includes('row-level security') && (
                      <div className="mt-2 text-[11px] text-rose-300/80 leading-relaxed">
                        <strong className="text-white">Solusi RLS Supabase:</strong> Terdeteksi penolakan oleh Row-Level Security. Jalankan query SQL dari file <code className="bg-black/50 px-1 py-0.5 rounded text-[#a3e635]">supabase_rls.sql</code> di Supabase SQL Editor agar public/anon dapat menginput trip.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              id="submit-request"
              type="submit"
              disabled={isSubmitting}
              className={`${btnPrimary} mt-2 w-full py-3.5 text-xs ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  Menyimpan ke Server Supabase...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Kirim Permohonan Perjalanan
                </>
              )}
            </button>
          </form>
        </Card>
      )}

      {/* Riwayat Pengajuan (Full Width saat Tab Riwayat Aktif) */}
      {activeTab === 'history' && (
        <Card
          title="Riwayat Pengajuan Saya"
          subtitle={`Daftar seluruh riwayat pengajuan kendaraan dinas · Departemen ${user.dept || f.dept}`}
          action={
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`${btnPrimary} !py-1.5 !px-3 text-xs`}
            >
              <Plus size={14} /> Buat Pengajuan Baru
            </button>
          }
        >
          {mine.length === 0 ? (
            <Empty text="Belum ada permohonan perjalanan yang diajukan." />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {mine.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4.5 text-xs hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white text-[14px]">{t.destination}</p>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#a3e635]">
                        {t.dept}
                      </span>
                      {t.distance_km && (
                        <span className="rounded-md bg-[#a3e635]/15 border border-[#a3e635]/30 px-2 py-0.5 text-[10px] font-bold text-[#bef264]">
                          {t.distance_km} KM PP
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#93a097]">
                      {t.id} · {t.category} · {fmtDate(t.date)} · Jam {t.estDeparture}
                      {t.estReturn ? ` – ${t.estReturn}` : ''} WIB · Pemohon: {t.guest}
                      {t.estimated_duration_minutes && ` · Est. ~${t.estimated_duration_minutes} mnt`}
                    </p>

                    {/* Penumpang & Approver info */}
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-[#8fa99b]">
                      <span>Approver: <strong className="text-white">{t.spvName}</strong></span>
                      {t.requesterNik && <span>· NIK: <span className="font-mono text-white">{t.requesterNik}</span></span>}
                      {t.driverOnly ? (
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-300 font-semibold">
                          📦 Hanya Driver (Kupon Hangus / VOID)
                        </span>
                      ) : t.passengers && t.passengers.length > 0 ? (
                        <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[#bef264]">
                          +{t.passengers.length} Penumpang ({t.passengers.map((p) => `${p.name} [${p.dept}]`).join(', ')})
                        </span>
                      ) : null}
                    </div>

                    {t.driverId && (
                      <p className="text-[11px] text-[#bef264] font-medium">
                        Driver: {db.drivers.find((d) => d.id === t.driverId)?.name} · Plat: {t.plate}
                      </p>
                    )}

                    <TripRouteToggle trip={t} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSummaryTrip(t)}
                      title="Lihat Lembar Summary & QR E-Sign Dokumen Laporan"
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#a3e635] bg-[#a3e635] hover:bg-[#bef264] text-[#052e16] px-3 py-1.5 text-xs font-black transition shadow-md shadow-[#a3e635]/20 hover:scale-[1.02]"
                    >
                      <FileText size={14} className="text-[#052e16] stroke-[2.5]" />
                      <span>Summary & QR</span>
                    </button>

                    <Pill label={STATUS_LABEL[t.status]} tone={tripTone(t.status)} />

                    {/* Pre-Approval Phase: Tombol Aksi Edit & Hapus strictly HANYA jika status WAITING_SPV */}
                    {t.status === 'WAITING_SPV' && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <button
                          type="button"
                          title="Edit / Revisi Pengajuan [EDITED]"
                          onClick={() => setEditingTrip(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition shadow-xs"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          title="Hapus Pengajuan"
                          onClick={async () => {
                            if (confirm(`Apakah Anda yakin ingin menghapus pengajuan ${t.id} ke ${t.destination}? Tindakan ini tidak dapat dibatalkan.`)) {
                              const res = await deleteTrip(t.id)
                              if (res.success) {
                                notify(`Pengajuan ${t.id} berhasil dihapus dari sistem.`)
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

                    {(t.status === 'WAITING_SPV' || t.status === 'WAITING_POOL_SPV') && (
                      <a
                        href={`/approve/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#b8cfc2] px-3 py-1.5 text-[11px] font-bold text-[#176c4b] hover:bg-[#eef5f0]"
                      >
                        <Mail size={12} />
                        {t.status === 'WAITING_SPV' ? 'E-Sign SPV Dept' : 'E-Sign SPV Kendaraan'}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Modal Edit Permohonan (Pre-Approval Phase) */}
      <TripEditModal
        trip={editingTrip}
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
      />

      {/* Modal Summary Laporan & Lembar Pengesahan QR E-Sign */}
      <TripReportSummaryModal
        trip={summaryTrip}
        isOpen={!!summaryTrip}
        onClose={() => setSummaryTrip(null)}
      />

      {/* Modal Pengaturan SMTP Departemen / Akun */}
      <SmtpSettingsModal
        isOpen={smtpModalOpen}
        onClose={() => {
          setSmtpModalOpen(false)
          loadSenderSmtp()
        }}
        user={user}
        onSaved={loadSenderSmtp}
      />
    </>
  )
}

export function RequesterCoupons({ user }: { user: Account }) {
  const { db, claimCoupon } = useStore()
  const notify = useToast()
  const [selectedTicket, setSelectedTicket] = useState<Trip | null>(null)
  const [q, setQ] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'PAGE_10' | 'MONTH' | 'YEAR'>('PAGE_10')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()))
  const [page, setPage] = useState(1)

  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'

  const userDept = user.dept || 'ALL'

  // Filter trips for this requester's department that are DONE and coupon is eligible/processed
  const allDeptRows = useMemo(() => {
    return db.trips
      .filter((t) => (!user.dept || t.dept === user.dept) && t.status === 'DONE' && t.coupon !== 'NONE')
      .slice()
      .sort((a, b) => (b.date + (b.timeGo ?? '')).localeCompare(a.date + (a.timeGo ?? '')))
  }, [db.trips, user.dept])

  // Summary counts berdasarkan seluruh kupon departemen
  const claimable = allDeptRows.filter((t) => t.coupon === 'CLAIMABLE')
  const inProgress = allDeptRows.filter((t) => t.coupon === 'PR_PENDING' || t.coupon === 'PR_PROGRESS')
  const created = allDeptRows.filter((t) => t.coupon === 'PAID')

  // Kumpulkan tahun-tahun yang tersedia dari dataset kupon agar selalu bertambah dinamis
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearsSet = new Set<string>()
    yearsSet.add(String(currentYear))
    allDeptRows.forEach((t) => {
      if (t.date && t.date.length >= 4) {
        yearsSet.add(t.date.slice(0, 4))
      }
    })
    return Array.from(yearsSet).sort().reverse()
  }, [allDeptRows])

  // 1. Filter awal berdasarkan search query
  const searchedRows = useMemo(() => {
    if (!q.trim()) return allDeptRows
    const lowerQ = q.toLowerCase()
    return allDeptRows.filter((t) => {
      const matchDest = (t.destination || '').toLowerCase().includes(lowerQ)
      const matchUser = `${t.requesterName || ''} ${t.requesterNik || ''} ${t.guest || ''}`.toLowerCase().includes(lowerQ)
      const matchDriver = dn(t.driverId).toLowerCase().includes(lowerQ)
      const matchPlate = (t.plate || '').toLowerCase().includes(lowerQ)
      const matchPR = (t.prNumber || '').toLowerCase().includes(lowerQ)
      const matchId = (t.id || '').toLowerCase().includes(lowerQ)
      return matchDest || matchUser || matchDriver || matchPlate || matchPR || matchId
    })
  }, [allDeptRows, q])

  // 2. Filter periode (PAGE_10: semua data tapi per 10 baris, MONTH: bulanan, YEAR: tahunan)
  const filteredRows = useMemo(() => {
    if (periodFilter === 'MONTH') {
      return searchedRows.filter((t) => t.date && t.date.startsWith(selectedMonth))
    }
    if (periodFilter === 'YEAR') {
      return searchedRows.filter((t) => t.date && t.date.startsWith(selectedYear))
    }
    return searchedRows
  }, [searchedRows, periodFilter, selectedMonth, selectedYear])

  // 3. Pagination 10 per page
  const rowsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage
    return filteredRows.slice(start, start + rowsPerPage)
  }, [filteredRows, safePage])

  // Reset pagination saat filter atau pencarian berubah
  useEffect(() => {
    setPage(1)
  }, [periodFilter, selectedMonth, selectedYear, q])

  // Download handler CSV sesuai opsi filter yang aktif
  const handleExport = () => {
    const suffix =
      periodFilter === 'MONTH'
        ? `bulan-${selectedMonth}`
        : periodFilter === 'YEAR'
          ? `tahun-${selectedYear}`
          : `per-10-baris-hal-${safePage}`

    const dataToExport = periodFilter === 'PAGE_10' ? paginatedRows : filteredRows
    const head = ['TGL TRIP', 'TIKET ID', 'PEMOHON', 'NIK', 'DEPARTEMEN', 'TUJUAN', 'DRIVER', 'NO POL', 'JAM BERANGKAT', 'JAM KEMBALI', 'STATUS KUPON', 'NOMOR PR']
    const lines = dataToExport.map((t) => [
      t.date,
      t.id,
      t.requesterName || t.guest,
      t.requesterNik || '',
      t.dept,
      t.destination,
      dn(t.driverId),
      t.plate ?? '',
      fmtTime(t.timeGo),
      fmtTime(t.timeBack),
      COUPON_LABEL[t.coupon],
      t.prNumber ?? '',
    ])
    const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeffsep=;\r\n' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kupon-${userDept.toLowerCase()}-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Panel Kupon & Pencairan Makan Siang"
        desc={`Pelacakan real-time klaim kupon makan siang driver/pemohon Departemen ${userDept} · Berhak kupon jika berangkat sebelum makan siang (< 13:00 WIB) dan kembali setelah makan siang (≥ 12:00 WIB).`}
        action={
          <button onClick={handleExport} className={`${btnPrimary} shadow-md`}>
            <Download size={14} />
            <span>
              Export Excel ({periodFilter === 'MONTH' ? `Bulan ${selectedMonth}` : periodFilter === 'YEAR' ? `Tahun ${selectedYear}` : `Hal ${safePage} (10 Data)`})
            </span>
          </button>
        }
      />

      {/* Panel Pelacakan Requester (Summary Card) */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">Siap Diajukan</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {claimable.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{claimable.length} <span className="text-xs font-normal text-[#8fa99b]">Kupon</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Perlu klik tombol &quot;Ajukan Klaim&quot;</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">Proses PR (Finance)</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {inProgress.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300">{inProgress.length} <span className="text-xs font-normal text-[#8fa99b]">Klaim</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Sedang diproses pembuatan PR</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8fa99b]">PR Selesai (Created)</span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
              {created.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-400">{created.length} <span className="text-xs font-normal text-[#8fa99b]">Selesai</span></p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Nomor PR terbit & siap disbursement</p>
        </div>
      </div>

      <Card
        title="Daftar Kupon & Status Pencairan"
        subtitle={`${filteredRows.length} data kupon terpilih · Menampilkan 10 per halaman`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Mode Periode */}
            <div className="flex items-center rounded-xl bg-black/40 border border-white/10 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPeriodFilter('PAGE_10')}
                className={`px-3 py-1 rounded-lg font-bold transition ${periodFilter === 'PAGE_10'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
                  }`}
              >
                Per 10 Data
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('MONTH')}
                className={`px-3 py-1 rounded-lg font-bold transition ${periodFilter === 'MONTH'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
                  }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('YEAR')}
                className={`px-3 py-1 rounded-lg font-bold transition ${periodFilter === 'YEAR'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
                  }`}
              >
                Tahunan
              </button>
            </div>

            {/* Pilihan Bulan jika mode Bulanan */}
            {periodFilter === 'MONTH' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 rounded-xl bg-black/40 border border-white/10 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#a3e635]"
              />
            )}

            {/* Pilihan Tahun jika mode Tahunan */}
            {periodFilter === 'YEAR' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-8 rounded-xl bg-black/40 border border-white/10 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#a3e635]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-[#052115] text-white">
                    Tahun {y}
                  </option>
                ))}
              </select>
            )}

            {/* Input Pencarian */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pemohon / NIK / tujuan / driver..."
              className="h-8 w-48 sm:w-56 rounded-xl bg-black/40 border border-white/10 px-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#a3e635]"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-wider text-[#a3e635]">
              <tr>
                <th className="px-3.5 py-3 whitespace-nowrap">TGL TRIP</th>
                <th className="px-3.5 py-3 max-w-[260px]">TUJUAN</th>
                <th className="px-3.5 py-3 whitespace-nowrap">PEMOHON / NIK</th>
                <th className="px-3.5 py-3 whitespace-nowrap">DRIVER</th>
                <th className="px-3.5 py-3 whitespace-nowrap">JAM BERANGKAT</th>
                <th className="px-3.5 py-3 whitespace-nowrap">JAM KEMBALI</th>
                <th className="px-4 py-3 min-w-[150px] whitespace-nowrap">STATUS KUPON</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">AKSI / DETAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#93a097]">
                    Tidak ada riwayat kupon yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((t) => {
                  const driverName = dn(t.driverId)
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                      {/* TGL TRIP */}
                      <td className="px-3.5 py-3.5 text-[#9bb7a8] whitespace-nowrap font-mono text-[11px]">
                        {fmtDate(t.date)}
                      </td>

                      {/* TUJUAN (Max width rapi dengan line-clamp agar tidak stretch) */}
                      <td className="px-3.5 py-3.5 text-[#bef264] font-medium max-w-[260px]" title={t.destination}>
                        <span className="line-clamp-2 leading-relaxed">{t.destination}</span>
                        <span className="text-[10px] text-[#8fa99b] font-mono block mt-0.5">{t.id}</span>
                      </td>

                      {/* PEMOHON / NIK */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{t.requesterName || t.guest}</div>
                        <div className="text-[10px] text-[#8fa99b] font-mono">NIK: {t.requesterNik || '—'}</div>
                      </td>

                      {/* DRIVER */}
                      <td className="px-3.5 py-3.5 font-semibold text-white whitespace-nowrap">
                        <div>{driverName}</div>
                        {t.plate && <div className="text-[10px] font-mono text-[#a3e635]">{t.plate}</div>}
                      </td>

                      {/* JAM BERANGKAT */}
                      <td className="px-3.5 py-3.5 text-[#8fa99b] whitespace-nowrap font-mono">
                        {fmtTime(t.timeGo)} WIB
                      </td>

                      {/* JAM KEMBALI */}
                      <td className="px-3.5 py-3.5 font-bold text-[#bef264] whitespace-nowrap font-mono">
                        {fmtTime(t.timeBack)} WIB
                      </td>

                      {/* STATUS KUPON */}
                      <td className="px-4 py-3.5 min-w-[150px] whitespace-nowrap">
                        <div className="space-y-1">
                          <Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} />
                          {t.prNumber && (
                            <div className="text-[10px] font-mono text-sky-400 font-bold block">
                              PR: {t.prNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* AKSI / DETAIL */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {t.coupon === 'CLAIMABLE' && (
                            <button
                              onClick={() => {
                                claimCoupon(t.id)
                                notify('Klaim diajukan ke Admin Kupon (Status: Belum Dibuat PR)')
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition"
                            >
                              <Send size={11} />
                              Ajukan Klaim
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTicket(t)}
                            className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 text-[11px] font-semibold transition"
                          >
                            Lihat Tiket
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bar Navigasi Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-[#8fa99b]">
            <div>
              Menampilkan <b>{(safePage - 1) * rowsPerPage + 1}</b>–
              <b>{Math.min(safePage * rowsPerPage, filteredRows.length)}</b> dari <b>{filteredRows.length}</b> data
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <span className="px-2 font-mono text-white font-bold">
                Hal {safePage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Detail Tiket Kupon (Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali) */}
      {selectedTicket && (
        <ModalPortal onClose={() => setSelectedTicket(null)}>
          <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 text-white shadow-2xl space-y-5 max-h-[88vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header Tiket */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#a3e635] px-2 py-0.5 text-[10px] font-extrabold text-[#052e16]">
                    TIKET KUPON MAKAN
                  </span>
                  <span className="text-xs font-mono text-[#8fa99b]">{selectedTicket.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">PT. JAI Kupon Elektronik</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-full bg-white/10 p-1 text-[#8fa99b] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Informasi Detail Wajib: Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Nama Pemohon / Tamu:</span>
                <span className="font-bold text-white text-sm">{selectedTicket.requesterName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">NIK Pemohon:</span>
                <span className="font-mono font-bold text-white">{selectedTicket.requesterNik || 'JAI-2018042'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Departemen:</span>
                <span className="font-medium text-white">{selectedTicket.dept}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Tujuan Perjalanan:</span>
                <span className="font-bold text-[#bef264]">{selectedTicket.destination}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Jam Berangkat (Aktual):</span>
                <span className="font-semibold text-white">{fmtTime(selectedTicket.timeGo)} WIB</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Jam Kembali (Aktual):</span>
                <span className="font-bold text-[#bef264] text-sm">{fmtTime(selectedTicket.timeBack)} WIB</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[#8fa99b]">Driver yang Bertugas:</span>
                <span className="font-semibold text-white">
                  {db.drivers.find((d) => d.id === selectedTicket.driverId)?.name ?? '—'} ({selectedTicket.plate ?? '—'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[#8fa99b]">Status Kupon Saat Ini:</span>
                <Pill label={COUPON_LABEL[selectedTicket.coupon]} tone={couponTone(selectedTicket.coupon)} />
              </div>
              {selectedTicket.prNumber && (
                <div className="mt-2 rounded-lg bg-sky-950/40 border border-sky-500/30 p-2.5">
                  <div className="text-[10px] text-sky-300 font-semibold uppercase">Nomor Purchase Request (PR):</div>
                  <div className="text-base font-black font-mono text-sky-400">{selectedTicket.prNumber}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Dibuat oleh: {selectedTicket.prCreatedBy || selectedTicket.paidBy || 'Finance'} • {selectedTicket.prCreatedAt ? fmtDate(selectedTicket.prCreatedAt.slice(0, 10)) : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition"
              >
                Tutup Tiket
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}
