'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Sliders,
  ExternalLink,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  X,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Eye,
} from 'lucide-react'
import { type Role, ROLE_LABEL } from '@/lib/accounts'
import {
  getAllGuidances,
  saveGuidance,
  resetGuidancesToDefault,
  type RoleGuidance,
  type Slide,
} from '@/lib/guidance'
import { Card, PageHeader, useToast } from '../ui-bits'
import { ModalPortal } from '../modal-portal'

export function AdminManageGuidanceView() {
  const notify = useToast()
  const [guidances, setGuidances] = useState<Record<Role, RoleGuidance>>(() => getAllGuidances())
  const [selectedRole, setSelectedRole] = useState<Role>('admin')

  // Edit State for Selected Role Guidance
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editInterval, setEditInterval] = useState(6)
  const [editEmbedUrl, setEditEmbedUrl] = useState('')
  const [slides, setSlides] = useState<Slide[]>([])

  // Modal / Inline Slide Editor
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)
  const [slideModalOpen, setSlideModalOpen] = useState(false)
  const [slideFormData, setSlideFormData] = useState<{
    id: string
    title: string
    subtitle: string
    content: string
    points: string
    badge: string
    illustrationType: Slide['illustrationType']
    imageUrl: string
    uiContextType: Slide['uiContextType']
  }>({
    id: '',
    title: '',
    subtitle: '',
    content: '',
    points: '',
    badge: '',
    illustrationType: 'admin',
    imageUrl: '',
    uiContextType: 'default',
  })

  // Load selected role data into state
  useEffect(() => {
    const current = guidances[selectedRole]
    if (current) {
      setEditTitle(current.title || '')
      setEditDesc(current.description || '')
      setEditInterval(current.autoPlayInterval || 6)
      setEditEmbedUrl(current.pptEmbedUrl || '')
      setSlides(current.slides || [])
    }
  }, [selectedRole, guidances])

  const handleSaveRoleGuidance = () => {
    const updated: RoleGuidance = {
      role: selectedRole,
      title: editTitle.trim() || `Panduan ${ROLE_LABEL[selectedRole]}`,
      description: editDesc.trim(),
      autoPlayInterval: Number(editInterval) || 6,
      pptEmbedUrl: editEmbedUrl.trim() || undefined,
      slides,
    }

    saveGuidance(selectedRole, updated)
    setGuidances(getAllGuidances())
    notify(`Panduan untuk ${ROLE_LABEL[selectedRole]} berhasil disimpan!`)
  }

  const handleResetDefault = () => {
    if (confirm('Kembalikan seluruh panduan semua akun ke setelan default pabrik?')) {
      const def = resetGuidancesToDefault()
      setGuidances(def)
      notify('Panduan telah dikembalikan ke standar default!')
    }
  }

  // Open modal to add new slide
  const openAddSlideModal = () => {
    setEditingSlide(null)
    setSlideFormData({
      id: `slide-${Date.now()}`,
      title: '',
      subtitle: '',
      content: '',
      points: '',
      badge: `SLIDE ${slides.length + 1}`,
      illustrationType: 'admin',
      imageUrl: '',
      uiContextType: 'default',
    })
    setSlideModalOpen(true)
  }

  // Open modal to edit existing slide
  const openEditSlideModal = (s: Slide) => {
    setEditingSlide(s)
    setSlideFormData({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle || '',
      content: s.content,
      points: (s.points || []).join('\n'),
      badge: s.badge || '',
      illustrationType: s.illustrationType || 'admin',
      imageUrl: s.imageUrl || '',
      uiContextType: s.uiContextType || 'default',
    })
    setSlideModalOpen(true)
  }

  const handleSaveSlideForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slideFormData.title.trim() || !slideFormData.content.trim()) {
      alert('Judul dan Konten Slide wajib diisi!')
      return
    }

    const pointsArr = slideFormData.points
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)

    const updatedSlide: Slide = {
      id: slideFormData.id || `slide-${Date.now()}`,
      title: slideFormData.title.trim(),
      subtitle: slideFormData.subtitle.trim() || undefined,
      content: slideFormData.content.trim(),
      points: pointsArr.length > 0 ? pointsArr : undefined,
      badge: slideFormData.badge.trim() || undefined,
      illustrationType: slideFormData.illustrationType,
      imageUrl: slideFormData.imageUrl.trim() || undefined,
      uiContextType: slideFormData.uiContextType || 'default',
    }

    let nextSlides: Slide[]
    if (editingSlide) {
      nextSlides = slides.map((s) => (s.id === editingSlide.id ? updatedSlide : s))
    } else {
      nextSlides = [...slides, updatedSlide]
    }

    setSlides(nextSlides)
    setSlideModalOpen(false)

    // Save directly
    const updatedRoleGuidance: RoleGuidance = {
      role: selectedRole,
      title: editTitle.trim(),
      description: editDesc.trim(),
      autoPlayInterval: Number(editInterval) || 6,
      pptEmbedUrl: editEmbedUrl.trim() || undefined,
      slides: nextSlides,
    }
    saveGuidance(selectedRole, updatedRoleGuidance)
    setGuidances(getAllGuidances())
    notify(editingSlide ? 'Slide berhasil diperbarui!' : 'Slide baru berhasil ditambahkan!')
  }

  const handleDeleteSlide = (slideId: string) => {
    if (!confirm('Hapus slide ini?')) return
    const nextSlides = slides.filter((s) => s.id !== slideId)
    setSlides(nextSlides)

    const updatedRoleGuidance: RoleGuidance = {
      role: selectedRole,
      title: editTitle.trim(),
      description: editDesc.trim(),
      autoPlayInterval: Number(editInterval) || 6,
      pptEmbedUrl: editEmbedUrl.trim() || undefined,
      slides: nextSlides,
    }
    saveGuidance(selectedRole, updatedRoleGuidance)
    setGuidances(getAllGuidances())
    notify('Slide berhasil dihapus!')
  }

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= slides.length) return
    const next = [...slides]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    setSlides(next)

    const updatedRoleGuidance: RoleGuidance = {
      role: selectedRole,
      title: editTitle.trim(),
      description: editDesc.trim(),
      autoPlayInterval: Number(editInterval) || 6,
      pptEmbedUrl: editEmbedUrl.trim() || undefined,
      slides: next,
    }
    saveGuidance(selectedRole, updatedRoleGuidance)
    setGuidances(getAllGuidances())
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Kelola Panduan & PPT (Admin Mode)"
        desc="Atur materi slide presentasi, durasi auto-play, atau embed presentasi eksternal untuk tiap peran akun"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
            >
              <RotateCcw size={14} /> Reset Default Pabrik
            </button>
          </div>
        }
      />

      {/* Role Picker Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {(Object.keys(guidances) as Role[]).map((r) => {
          const isSel = selectedRole === r
          const slideCount = guidances[r]?.slides?.length || 0
          return (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                isSel
                  ? 'border-[#a3e635] bg-[#a3e635]/15 ring-2 ring-[#a3e635]/40 shadow-md'
                  : 'border-white/10 bg-black/20 hover:border-[#a3e635]/30 hover:bg-white/5'
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${isSel ? 'text-[#bef264]' : 'text-slate-400'}`}>
                {ROLE_LABEL[r]}
              </p>
              <p className={`mt-1 text-xs font-extrabold ${isSel ? 'text-white' : 'text-slate-200'}`}>
                {slideCount} Slide
              </p>
            </button>
          )
        })}
      </div>

      {/* Settings for the Selected Role */}
      <Card
        title={`Konfigurasi Materi: ${ROLE_LABEL[selectedRole]}`}
        subtitle="Ubah informasi umum dan durasi perpindahan slide otomatis"
        className="p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-white mb-1">
              Judul Presentasi Panduan
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white focus:border-[#a3e635] focus:outline-none placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white mb-1">
              Durasi Auto-Slide (Detik)
            </label>
            <input
              type="number"
              min={3}
              max={60}
              value={editInterval}
              onChange={(e) => setEditInterval(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 font-mono text-xs font-bold text-[#bef264] focus:border-[#a3e635] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-white mb-1">
              Deskripsi Singkat / SOP
            </label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-[#d7e6dc] focus:border-[#a3e635] focus:outline-none placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white mb-1">
              URL Embed PPT / Canva / Slides (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/presentation/d/.../embed"
              value={editEmbedUrl}
              onChange={(e) => setEditEmbedUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 font-mono text-xs text-[#d7e6dc] focus:border-[#a3e635] focus:outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={handleSaveRoleGuidance}
            className="flex items-center gap-1.5 rounded-xl bg-[#a3e635] px-4 py-2 text-xs font-bold text-[#052e16] shadow-sm hover:bg-[#bef264] transition"
          >
            <Save size={14} /> Simpan Pengaturan
          </button>
        </div>
      </Card>

      {/* Slide Deck Management List */}
      <Card
        title={`Daftar Slide Presentasi (${slides.length} Slide)`}
        subtitle="Urutkan, edit teks, atau tambah slide baru untuk peran ini"
        action={
          <button
            type="button"
            onClick={openAddSlideModal}
            className="flex items-center gap-1.5 rounded-xl bg-[#075b3d] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#064e34] transition"
          >
            <Plus size={15} /> Tambah Slide Baru
          </button>
        }
        className="p-5"
      >
        {slides.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#8b9b92]">
            Belum ada slide untuk peran ini. Klik &quot;Tambah Slide Baru&quot; di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((s, idx) => (
              <div
                key={s.id || idx}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-[#a3e635]/40 hover:bg-black/60 shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#a3e635] text-[#052e16] font-black text-xs shadow-md">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#a3e635]/20 px-2 py-0.5 text-[9px] font-black text-[#bef264] border border-[#a3e635]/30">
                        {s.badge || `SLIDE ${idx + 1}`}
                      </span>
                      {s.imageUrl ? (
                        <span className="rounded-md bg-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <ImageIcon size={11} className="text-[#a3e635]" /> Ada Foto
                        </span>
                      ) : (
                        <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30">
                          UI Mockup: {s.uiContextType || 'Default'}
                        </span>
                      )}
                      <h4 className="text-sm font-extrabold text-white tracking-tight">{s.title}</h4>
                    </div>
                    {s.subtitle && (
                      <p className="text-xs font-bold text-[#bef264]">{s.subtitle}</p>
                    )}
                    <p className="text-xs text-[#e2f0e8] leading-relaxed line-clamp-2">{s.content}</p>
                    {s.points && s.points.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {s.points.map((pt, pIdx) => (
                          <span
                            key={pIdx}
                            className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs"
                          >
                            <strong className="text-[#a3e635] mr-1">✓</strong> {pt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveSlide(idx, 'up')}
                    title="Naikkan Urutan"
                    className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30 transition"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={idx === slides.length - 1}
                    onClick={() => moveSlide(idx, 'down')}
                    title="Turunkan Urutan"
                    className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30 transition"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => openEditSlideModal(s)}
                    title="Edit Slide"
                    className="flex size-8 items-center justify-center rounded-xl border border-[#a3e635]/40 bg-[#a3e635]/20 text-[#bef264] hover:bg-[#a3e635]/30 transition"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteSlide(s.id)}
                    title="Hapus Slide"
                    className="flex size-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* MODAL: Tambah / Edit Slide */}
      {slideModalOpen && (
        <ModalPortal onClose={() => setSlideModalOpen(false)}>
          <div className="relative w-full max-w-xl rounded-3xl bg-[#091e14] shadow-2xl border border-white/20 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#a3e635] text-[#052e16] font-bold">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {editingSlide ? 'Edit Slide Presentasi' : 'Tambah Slide Presentasi Baru'}
                  </h3>
                  <p className="text-[11px] text-[#a3e635] font-semibold">Peran: {ROLE_LABEL[selectedRole]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlideModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlideForm} className="overflow-y-auto p-6 space-y-4 text-left flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">
                    Label Badge Slide <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: SLIDE 1 · OVERVIEW"
                    value={slideFormData.badge}
                    onChange={(e) => setSlideFormData({ ...slideFormData, badge: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white focus:border-[#a3e635] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">
                    Tipe Ikon Ilustrasi
                  </label>
                  <select
                    value={slideFormData.illustrationType}
                    onChange={(e) =>
                      setSlideFormData({
                        ...slideFormData,
                        illustrationType: e.target.value as Slide['illustrationType'],
                      })
                    }
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white focus:border-[#a3e635] focus:outline-none"
                  >
                    <option value="admin" className="bg-[#091e14]">Buku / Admin</option>
                    <option value="car" className="bg-[#091e14]">Kendaraan / Armada</option>
                    <option value="calendar" className="bg-[#091e14]">Kalender / Jadwal</option>
                    <option value="shield" className="bg-[#091e14]">Perisai / Keamanan</option>
                    <option value="check" className="bg-[#091e14]">Ceklis / Selesai</option>
                    <option value="ticket" className="bg-[#091e14]">Tiket / Kupon</option>
                    <option value="driver" className="bg-[#091e14]">Driver / Sopir</option>
                    <option value="matrix" className="bg-[#091e14]">Matriks / Pengguna</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Judul Utama Slide <span className="text-[#a3e635]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Penjadwalan via Interactive Timeline"
                  value={slideFormData.title}
                  onChange={(e) => setSlideFormData({ ...slideFormData, title: e.target.value })}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white focus:border-[#a3e635] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Sub-Judul (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: Modul Waiting List & Scheduling Center"
                  value={slideFormData.subtitle}
                  onChange={(e) => setSlideFormData({ ...slideFormData, subtitle: e.target.value })}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-[#d7e6dc] focus:border-[#a3e635] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Deskripsi Penjelasan Slide <span className="text-[#a3e635]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan penjelasan materi atau SOP yang ingin disampaikan pada slide ini..."
                  value={slideFormData.content}
                  onChange={(e) => setSlideFormData({ ...slideFormData, content: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white leading-relaxed focus:border-[#a3e635] focus:outline-none"
                />
              </div>

              {/* Input Screenshot Gambar / Mockup Visual */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-[#a3e635]" /> Gambar Petunjuk / Screenshot Halaman Web
                  </label>
                  {slideFormData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setSlideFormData({ ...slideFormData, imageUrl: '' })}
                      className="text-[10px] text-red-400 hover:text-red-300 hover:underline font-bold"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: URL atau Public Path */}
                  <div>
                    <label className="block text-[10px] text-[#8fa99b] mb-1 font-medium">
                      Path File / URL Gambar Screenshot:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="misal: /guidance/form-requester.png atau https://..."
                        value={slideFormData.imageUrl}
                        onChange={(e) => setSlideFormData({ ...slideFormData, imageUrl: e.target.value })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/50 pl-8 pr-3 text-xs text-white focus:border-[#a3e635] focus:outline-none placeholder:text-white/30"
                      />
                      <LinkIcon size={13} className="absolute left-2.5 top-2.5 text-white/40" />
                    </div>
                  </div>

                  {/* Option 2: Upload File Langsung dari Komputer (Base64) */}
                  <div>
                    <label className="block text-[10px] text-[#8fa99b] mb-1 font-medium">
                      Atau Upload File Gambar dari Laptop/PC:
                    </label>
                    <label className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#a3e635]/40 bg-[#a3e635]/10 px-3 text-xs font-bold text-[#bef264] hover:bg-[#a3e635]/20 transition">
                      <Upload size={13} />
                      <span>Pilih Foto Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 3 * 1024 * 1024) {
                              alert('Ukuran file foto maksimal 3MB!')
                              return
                            }
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setSlideFormData({
                                  ...slideFormData,
                                  imageUrl: ev.target.result as string,
                                })
                              }
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Preview Mini Gambar jika terisi */}
                {slideFormData.imageUrl && (
                  <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black/50 p-2.5">
                    <p className="text-[10px] text-[#a3e635] mb-1.5 font-bold flex items-center gap-1">
                      <Eye size={12} /> Preview Foto Screenshot yang akan Tampil:
                    </p>
                    <div className="relative max-h-40 overflow-hidden rounded-lg bg-black/60 flex items-center justify-center">
                      <img
                        src={slideFormData.imageUrl}
                        alt="Preview Screenshot"
                        className="max-h-40 w-auto object-contain rounded-md"
                      />
                    </div>
                  </div>
                )}

                {/* Tipe Mockup Default (Jika tidak ada file screenshot) */}
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-[10px] text-[#8fa99b] mb-1 font-medium">
                    Tampilan Miniatur Halaman Alternatif (Jika belum ada foto):
                  </label>
                  <select
                    value={slideFormData.uiContextType || 'default'}
                    onChange={(e) =>
                      setSlideFormData({
                        ...slideFormData,
                        uiContextType: e.target.value as Slide['uiContextType'],
                      })
                    }
                    className="h-8 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-xs text-white focus:border-[#a3e635] focus:outline-none"
                  >
                    <option value="requester_form" className="bg-[#091e14]">Formulir Pengajuan Requester (Input Dinas & Penumpang)</option>
                    <option value="requester_tracking" className="bg-[#091e14]">Tracking Tiket & Notifikasi E-Pass</option>
                    <option value="approver_inbox" className="bg-[#091e14]">Inbox Persetujuan E-Sign Manager</option>
                    <option value="admin_timeline" className="bg-[#091e14]">Timeline Penjadwalan Drag-to-Book (Slot Jam & Armada)</option>
                    <option value="admin_accounts" className="bg-[#091e14]">Kelola Akun & Hak Akses Pengguna</option>
                    <option value="driver_tasks" className="bg-[#091e14]">Jadwal Tugas Harian Driver (Mobile View)</option>
                    <option value="security_gate" className="bg-[#091e14]">Pos Gerbang Security (Gate Out & Gate In)</option>
                    <option value="coupon_claims" className="bg-[#091e14]">Panel Kupon & Verifikasi Klaim Keuangan</option>
                    <option value="default" className="bg-[#091e14]">Visual Standar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Poin Kunci Checklist (1 baris per poin)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pilih tiket permohonan berstatus WAITING_ASSIGN&#10;Klik dan seret pada baris kendaraan&#10;Klik Simpan"
                  value={slideFormData.points}
                  onChange={(e) => setSlideFormData({ ...slideFormData, points: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-[#a3e635] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSlideModalOpen(false)}
                  className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#a3e635] px-4 py-2 text-xs font-bold text-[#052e16] shadow-md hover:bg-[#bef264] transition"
                >
                  <Check size={14} /> Simpan Slide
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
