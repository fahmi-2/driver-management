'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Edit3,
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  Users,
  Trash2,
  AlertCircle,
  Plus,
  Loader2,
  Mail,
  Building,
} from 'lucide-react'
import {
  DEPARTMENTS,
  getSectionsByDept,
  getApproverByGolongan,
  type Golongan,
} from '@/lib/accounts'
import { useStore, type Trip, type Passenger, type Category, ymd } from '@/lib/store'
import { btnGhost, btnPrimary, inputCls, useToast } from './ui-bits'
import { DestinationAutocomplete } from './destination-autocomplete'

interface TripEditModalProps {
  trip: Trip | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TripEditModal({ trip, isOpen, onClose, onSuccess }: TripEditModalProps) {
  const { editTrip } = useStore()
  const notify = useToast()

  const [date, setDate] = useState(ymd())
  const [category, setCategory] = useState<Category>('Dinas')
  const [golongan, setGolongan] = useState<Golongan>(1)
  const [dept, setDept] = useState('PGA')
  const [section, setSection] = useState('')
  const [approverName, setApproverName] = useState('')
  const [approverEmail, setApproverEmail] = useState('')
  const [approverRole, setApproverRole] = useState<'SSPV' | 'Manager'>('SSPV')
  const [requesterName, setRequesterName] = useState('')
  const [requesterNik, setRequesterNik] = useState('')
  const [driverOnly, setDriverOnly] = useState(false)
  const [additionalUsers, setAdditionalUsers] = useState<Passenger[]>([])

  const [origin, setOrigin] = useState('PT. JAI')
  const [destination, setDestination] = useState('')
  const [destinations, setDestinations] = useState<string[]>([])
  const [returnToOrigin, setReturnToOrigin] = useState(true)
  const [distanceKm, setDistanceKm] = useState<number | undefined>(undefined)
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number | undefined>(undefined)

  const [purpose, setPurpose] = useState('')
  const [estDeparture, setEstDeparture] = useState('08:00')
  const [estReturn, setEstReturn] = useState('12:00')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Populate data when trip changes
  useEffect(() => {
    if (!trip) return

    setDate(trip.date || ymd())
    setCategory(trip.category || 'Dinas')
    const g = (trip.golongan as Golongan) || 1
    setGolongan(g)
    const d = trip.dept || 'PGA'
    setDept(d)
    const s = trip.section || ''
    setSection(s)

    const appr = getApproverByGolongan(d, s, g)
    setApproverName(trip.spvName || appr.name)
    setApproverEmail(trip.approverEmail || trip.spvEmail || appr.email)
    setApproverRole(trip.approverRole || appr.approverRole)

    setRequesterName(trip.requesterName || '')
    setRequesterNik(trip.requesterNik || '')
    setDriverOnly(!!trip.driverOnly)

    // Separate main requester from additional passengers
    const pass = trip.passengers || []
    if (pass.length > 0) {
      // First passenger usually matches requester
      const otherPass = pass.slice(1)
      setAdditionalUsers(otherPass)
    } else {
      setAdditionalUsers([])
    }

    setOrigin(trip.origin || 'PT. JAI')
    setDestination(trip.destination || '')
    setDestinations(trip.destinations || (trip.destination ? [trip.destination] : ['']))
    setReturnToOrigin(trip.returnToOrigin !== false)
    setDistanceKm(trip.distance_km)
    setEstimatedDurationMinutes(trip.estimated_duration_minutes)

    setPurpose(trip.purpose || '')
    setEstDeparture(trip.estDeparture || '08:00')
    setEstReturn(trip.estReturn || '12:00')
    setErrorMsg(null)
  }, [trip, isOpen])

  if (!isOpen || !trip) return null

  // Strict check: User only allowed to edit if status is WAITING_SPV
  if (trip.status !== 'WAITING_SPV') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <h3 className="font-bold text-base text-slate-800">Dokumen Terkunci</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pengajuan <strong>{trip.id}</strong> telah diproses atau disetujui oleh atasan (status saat ini: <strong>{trip.status}</strong>). Sesuai aturan sistem, hak revisi terkunci dan hanya dapat disesuaikan melalui Admin Lobby.
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  const availableSections = getSectionsByDept(dept)

  const handleDeptChange = (newDept: string) => {
    const secList = getSectionsByDept(newDept)
    const newSec = secList[0] || ''
    const appr = getApproverByGolongan(newDept, newSec, golongan)
    setDept(newDept)
    setSection(newSec)
    setApproverName(appr.name)
    setApproverEmail(appr.email)
    setApproverRole(appr.approverRole)
  }

  const handleSectionChange = (newSec: string) => {
    const appr = getApproverByGolongan(dept, newSec, golongan)
    setSection(newSec)
    setApproverName(appr.name)
    setApproverEmail(appr.email)
    setApproverRole(appr.approverRole)
  }

  const handleGolonganChange = (newG: Golongan) => {
    const appr = getApproverByGolongan(dept, section, newG)
    setGolongan(newG)
    setApproverName(appr.name)
    setApproverEmail(appr.email)
    setApproverRole(appr.approverRole)
  }

  const handleAddUser = () => {
    setAdditionalUsers((prev) => [...prev, { name: '', nik: '', dept }])
  }

  const handleUpdateAdditionalUser = (index: number, field: keyof Passenger, value: string) => {
    setAdditionalUsers((prev) =>
      prev.map((u, i) => (i === index ? { ...u, [field]: value } : u))
    )
  }

  const handleRemoveAdditionalUser = (index: number) => {
    setAdditionalUsers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!requesterName.trim()) {
      notify('Nama Pemohon wajib diisi!', 'error')
      return
    }
    if (!destination.trim()) {
      notify('Tujuan lokasi perjalanan wajib diisi!', 'error')
      return
    }
    if (!purpose.trim()) {
      notify('Keperluan perjalanan wajib diisi!', 'error')
      return
    }

    const allPassengers: Passenger[] = driverOnly
      ? []
      : [
          { name: requesterName.trim(), nik: requesterNik.trim(), dept },
          ...additionalUsers.filter((u) => u.name.trim()),
        ]

    const guestLabel = driverOnly
      ? `Hanya Driver (Kirim Barang / Dokumen oleh ${requesterName.trim()})`
      : requesterName.trim()

    setIsSubmitting(true)
    try {
      const res = await editTrip(trip.id, {
        date,
        category,
        golongan,
        approverRole,
        dept,
        section,
        spvName: approverName,
        spvEmail: approverEmail,
        approverEmail,
        requesterName: requesterName.trim(),
        requesterNik: requesterNik.trim(),
        guest: guestLabel,
        driverOnly,
        passengers: allPassengers,
        origin,
        destination,
        destinations: destinations.filter(Boolean),
        returnToOrigin,
        distance_km: distanceKm,
        estimated_duration_minutes: estimatedDurationMinutes,
        purpose,
        estDeparture,
        estReturn,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan revisi pengajuan.')
        notify(res.error || 'Gagal menyimpan revisi pengajuan.', 'error')
        return
      }

      notify(
        `Berhasil merevisi pengajuan ${trip.id}! Email notifikasi terbaru berlabel [EDITED] telah dikirimkan ulang ke ${approverName}.`
      )
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem saat menyimpan revisi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#081f14] text-white shadow-2xl border border-white/15 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#075b3d] px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-lime-400 text-[#052e16] font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Revisi / Edit Permohonan Perjalanan</h3>
                <span className="rounded bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  Pre-Approval [EDITED]
                </span>
              </div>
              <p className="text-[10px] text-emerald-200">
                Tiket {trip.id} · Perubahan akan me-trigger ulang email notifikasi [EDITED] ke Approver
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:bg-emerald-800/40 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form id="edit-trip-form" onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Kategori & Golongan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Kategori Perjalanan
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={`${inputCls} bg-black/40`}
              >
                <option value="Dinas" className="bg-[#0f1f17] text-white">Dinas</option>
                <option value="Non-Dinas" className="bg-[#0f1f17] text-white">Non-Dinas</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Golongan Pemohon <span className="text-[#a3e635]">*Alur Approval</span>
              </label>
              <select
                value={golongan}
                onChange={(e) => handleGolonganChange(Number(e.target.value) as Golongan)}
                className={`${inputCls} bg-black/40 font-bold text-[#bef264]`}
              >
                <option value={1} className="bg-[#0f1f17] text-white">Golongan 1 (Approval: SSPV)</option>
                <option value={2} className="bg-[#0f1f17] text-white">Golongan 2 (Approval: SSPV)</option>
                <option value={3} className="bg-[#0f1f17] text-white">Golongan 3 (Approval: SSPV)</option>
                <option value={4} className="bg-[#0f1f17] text-white">Golongan 4 (Approval: Manager Langsung)</option>
              </select>
            </div>
          </div>

          {/* Pemohon Utama */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Nama Pemohon / Tamu Utama <span className="text-[#a3e635]">*</span>
              </label>
              <input
                type="text"
                required
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Nama pemohon"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                NIK Pemohon <span className="text-[#a3e635]">*</span>
              </label>
              <input
                type="text"
                required
                value={requesterNik}
                onChange={(e) => setRequesterNik(e.target.value)}
                placeholder="Contoh: JAI-2019001"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          {/* Departemen & Section */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Departemen Pemohon <span className="text-[#a3e635]">*</span>
              </label>
              <select
                value={dept}
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
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Section (Bagian) <span className="text-[#a3e635]">*</span>
              </label>
              <select
                value={section}
                onChange={(e) => handleSectionChange(e.target.value)}
                className={`${inputCls} bg-black/40 truncate`}
                required
              >
                {availableSections.map((sec) => (
                  <option key={sec} value={sec} className="bg-[#0f1f17] text-white">
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Approver Banner */}
          <div className="rounded-xl border border-[#a3e635]/30 bg-[#a3e635]/10 p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#e2f8d8]">
              <Mail size={14} className="text-[#a3e635] shrink-0" />
              <span>
                Notifikasi Revisi [EDITED] ditujukan ke: <strong className="text-white">{approverName}</strong>{' '}
                <span className="font-mono text-[#bef264]">({approverEmail})</span>
              </span>
            </div>
            <span className="rounded bg-[#052e16] px-2 py-0.5 text-[10px] font-extrabold text-[#bef264] border border-[#a3e635]/40 shrink-0">
              {approverRole}
            </span>
          </div>

          {/* Opsi Hanya Driver */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={driverOnly}
                onChange={(e) => setDriverOnly(e.target.checked)}
                className="size-4 rounded accent-[#a3e635]"
              />
              <span className="text-xs text-slate-200 font-semibold">
                📦 Hanya Driver (Kirim Barang / Dokumen Logistik Tanpa Penumpang)
              </span>
            </label>
          </div>

          {/* User Tambahan (Jika bukan Hanya Driver) */}
          {!driverOnly && (
            <div className="space-y-2 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#bef264]">
                  Penumpang / User Tambahan ({additionalUsers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddUser}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 px-2.5 py-1 text-[11px] font-bold text-[#bef264] hover:bg-[#a3e635]/20"
                >
                  <Plus size={12} /> Tambah Rekan
                </button>
              </div>

              {additionalUsers.map((u, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={u.name}
                    onChange={(e) => handleUpdateAdditionalUser(idx, 'name', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    required
                    placeholder="NIK"
                    value={u.nik || ''}
                    onChange={(e) => handleUpdateAdditionalUser(idx, 'nik', e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                  <select
                    value={u.dept}
                    onChange={(e) => handleUpdateAdditionalUser(idx, 'dept', e.target.value)}
                    className={`${inputCls} bg-black/40`}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#0f1f17] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalUser(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Rute Perjalanan Multi-Drop */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8fa99b]">
              Rute Perjalanan & Tujuan
            </label>
            <DestinationAutocomplete
              origin={origin}
              value={destination}
              destinations={destinations}
              returnToOrigin={returnToOrigin}
              distanceKm={distanceKm}
              durationMins={estimatedDurationMinutes}
              onChange={(data) => {
                setOrigin(data.origin)
                setDestination(data.destination)
                setDestinations(data.destinations)
                setReturnToOrigin(data.returnToOrigin ?? true)
                setDistanceKm(data.distance_km)
                setEstimatedDurationMinutes(data.estimated_duration_minutes)
              }}
            />
          </div>

          {/* Keperluan */}
          <div>
            <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
              Keperluan / Alasan Kunjungan <span className="text-[#a3e635]">*</span>
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Contoh: Meeting vendor / Pengiriman sampel"
              className={inputCls}
            />
          </div>

          {/* Tanggal & Waktu */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Tanggal Perjalanan <span className="text-[#a3e635]">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Estimasi Jam Berangkat <span className="text-[#a3e635]">*</span>
              </label>
              <input
                type="time"
                required
                value={estDeparture}
                onChange={(e) => setEstDeparture(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#8fa99b] block mb-1">
                Estimasi Jam Kembali <span className="text-[#a3e635]">*</span>
              </label>
              <input
                type="time"
                required
                value={estReturn}
                onChange={(e) => setEstReturn(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#052115] px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`${btnGhost} !px-4 !py-2 text-white/80 hover:text-white`}
          >
            Batal
          </button>
          <button
            type="submit"
            form="edit-trip-form"
            disabled={isSubmitting}
            className={`${btnPrimary} !px-6 !py-2.5 flex items-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin text-black" />
                Menyimpan Perubahan...
              </>
            ) : (
              <>
                <Edit3 size={14} />
                Simpan Revisi [EDITED]
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
