'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  ExternalLink,
  BookOpen,
  Sparkles,
  Shield,
  Truck,
  CheckCircle2,
  Calendar,
  Ticket,
  Users,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { type Role, ROLE_LABEL, type Account } from '@/lib/accounts'
import { getAllGuidances, type RoleGuidance, type Slide } from '@/lib/guidance'
import { Card, PageHeader, Pill } from '../ui-bits'
import { GuidanceUiMockup } from './guidance-mockup'

function SlideIcon({ type }: { type?: Slide['illustrationType'] }) {
  const size = 32
  switch (type) {
    case 'car':
      return <Truck size={size} className="text-[#a3e635]" />
    case 'shield':
      return <Shield size={size} className="text-amber-400" />
    case 'check':
      return <CheckCircle2 size={size} className="text-emerald-400" />
    case 'calendar':
      return <Calendar size={size} className="text-sky-400" />
    case 'ticket':
      return <Ticket size={size} className="text-purple-400" />
    case 'driver':
      return <Truck size={size} className="text-blue-400" />
    case 'matrix':
      return <Users size={size} className="text-teal-400" />
    case 'admin':
    default:
      return <BookOpen size={size} className="text-[#a3e635]" />
  }
}

export function GuidancePlayerView({
  user,
  overrideRole,
}: {
  user: Account
  overrideRole?: Role
}) {
  const targetRole: Role = overrideRole || user.role
  const [guidances, setGuidances] = useState<Record<Role, RoleGuidance>>(() => getAllGuidances())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [activeTabRole, setActiveTabRole] = useState<Role>(targetRole)

  // Listen to external updates from Admin
  useEffect(() => {
    const handleUpdate = () => {
      setGuidances(getAllGuidances())
    }
    window.addEventListener('guidance_updated', handleUpdate)
    return () => window.removeEventListener('guidance_updated', handleUpdate)
  }, [])

  useEffect(() => {
    setActiveTabRole(targetRole)
    setCurrentIndex(0)
    setProgress(0)
  }, [targetRole])

  const guidance = guidances[activeTabRole] || guidances.admin
  const slides = guidance.slides || []
  const currentSlide: Slide | undefined = slides[currentIndex]
  const intervalSeconds = guidance.autoPlayInterval || 6

  // Auto-play timer with smooth 100ms ticks
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) return

    const tickMs = 100
    const totalMs = intervalSeconds * 1000
    const step = (tickMs / totalMs) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % slides.length)
          return 0
        }
        return prev + step
      })
    }, tickMs)

    return () => clearInterval(timer)
  }, [isPlaying, slides.length, intervalSeconds, currentIndex])

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
    setProgress(0)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
    setProgress(0)
  }

  const handleGoTo = (idx: number) => {
    setCurrentIndex(idx)
    setProgress(0)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setProgress(0)
    setIsPlaying(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Panduan Sistem (Guidance)"
        desc={`Slide interaktif panduan operasional & SOP untuk peran: ${ROLE_LABEL[activeTabRole]}`}
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-[#10251c] px-3 py-1.5 text-xs font-semibold text-[#a3e635] border border-[#a3e635]/30 shadow-sm">
              <Sparkles size={14} /> Slide Otomatis
            </span>
          </div>
        }
      />

      {/* Role Switcher Pills (If user is admin or wants to inspect other roles) */}
      {(user.role === 'admin' || user.role === 'admin_lobby') && (
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0b2416]/80 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <span className="text-[11px] font-bold text-[#9ab3a4] px-2">Lihat Panduan Peran:</span>
          {(Object.keys(guidances) as Role[]).map((r) => {
            const isSel = activeTabRole === r
            return (
              <button
                key={r}
                onClick={() => {
                  setActiveTabRole(r)
                  setCurrentIndex(0)
                  setProgress(0)
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSel
                    ? 'bg-[#a3e635] text-[#052e16] font-bold shadow-md shadow-[#a3e635]/20 scale-105'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            )
          })}
        </div>
      )}

      {/* Main Slide Player Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-[#0c2e1f] via-[#081e14] to-[#04110a] shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
        {/* Glow backdrop decor */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-[#a3e635]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header Bar of the Slide Presentation */}
        <div className="relative flex items-center justify-between border-b border-white/10 bg-black/25 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#a3e635]/20 text-[#a3e635] ring-1 ring-[#a3e635]/40 shadow-sm">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight">{guidance.title}</h2>
              <p className="text-[11px] text-[#93a097] mt-0.5">{guidance.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-bold text-[#d9f99d] ring-1 ring-white/15">
              Slide {currentIndex + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Progress Bar (Auto-Play Timer) */}
        <div className="h-1.5 w-full bg-white/10 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#65a30d] via-[#84cc16] to-[#a3e635] transition-all duration-100 ease-linear shadow-[0_0_10px_#a3e635]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* PPT Embed Mode or Native Slide Presentation */}
        {guidance.pptEmbedUrl ? (
          <div className="relative min-h-[460px] p-6 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#8fa99b]">
                Menampilkan presentasi tersemat eksternal (Google Slides / OneDrive PPT / Canva):
              </p>
              <a
                href={guidance.pptEmbedUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#a3e635] hover:underline"
              >
                Buka di Tab Baru <ExternalLink size={13} />
              </a>
            </div>
            <iframe
              src={guidance.pptEmbedUrl}
              className="w-full flex-1 min-h-[420px] rounded-2xl border border-white/10 bg-black"
              allowFullScreen
            />
          </div>
        ) : currentSlide ? (
          /* Native Interactive PPT Slide */
          <div className="relative min-h-[420px] p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Badge & Step Indicator */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a3e635]/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#bef264] ring-1 ring-[#a3e635]/40 shadow-sm">
                  {currentSlide.badge || `Slide ${currentIndex + 1}`}
                </span>
                {isPlaying ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#86efac]">
                    <span className="size-2 rounded-full bg-[#86efac] animate-pulse" /> Berjalan ({intervalSeconds}d)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300">
                    <span className="size-2 rounded-full bg-amber-400" /> Jeda (Paused)
                  </span>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    {currentSlide.title}
                  </h1>
                  {currentSlide.subtitle && (
                    <p className="mt-1 text-sm font-semibold text-[#a3e635]">
                      {currentSlide.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                  <SlideIcon type={currentSlide.illustrationType} />
                </div>
              </div>

              {/* Slide Content & Visual Preview (Kombinasi Gambar / UI Mockup) */}
              <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
                {/* Kolom Kiri: Penjelasan & Poin Kunci (7 Kolom) */}
                <div className="lg:col-span-7 rounded-2xl bg-black/25 border border-white/10 p-5 sm:p-6 backdrop-blur-md space-y-4">
                  <p className="text-sm leading-relaxed text-[#d7e6dc] font-medium">
                    {currentSlide.content}
                  </p>

                  {/* Key Points / Bullet Checklist */}
                  {currentSlide.points && currentSlide.points.length > 0 && (
                    <div className="space-y-2.5 border-t border-white/10 pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa7a0]">
                        Poin Kunci & Tindakan:
                      </p>
                      <div className="grid gap-2">
                        {currentSlide.points.map((pt, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 text-xs text-white border border-white/5 shadow-2xs hover:bg-white/10 transition"
                          >
                            <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#a3e635] text-[#052e16] font-bold text-[9px]">
                              {i + 1}
                            </div>
                            <span className="leading-snug">{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kolom Kanan: Preview Gambar / Mockup Visual Halaman Web (5 Kolom) */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-[#8fa99b] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[#a3e635]" /> Visual Panduan Halaman
                    </span>
                    <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                      {currentSlide.imageUrl ? 'Screenshot File' : 'Interactive UI Preview'}
                    </span>
                  </div>

                  {currentSlide.imageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-2xl group relative">
                      <img
                        src={currentSlide.imageUrl}
                        alt={currentSlide.title}
                        className="w-full h-auto max-h-[360px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-[11px] text-white font-medium">{currentSlide.title}</span>
                      </div>
                    </div>
                  ) : (
                    <GuidanceUiMockup
                      contextType={currentSlide.uiContextType}
                      title={currentSlide.title}
                      subtitle={currentSlide.subtitle}
                    />
                  )}

                  <p className="text-[10px] text-center text-[#6e8578] italic mt-0.5">
                    *Gambar petunjuk disesuaikan dengan modul halaman sistem yang sedang dibahas.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide Navigation Dots */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => handleGoTo(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentIndex === idx
                      ? 'w-8 bg-[#a3e635] shadow-[0_0_12px_#a3e635]'
                      : 'w-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Ke Slide ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-[#93a097]">
            Belum ada slide panduan yang ditambahkan untuk peran ini.
          </div>
        )}

        {/* Footer Playback Controls Bar */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-black/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              title="Slide Sebelumnya"
              className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition active:scale-95 ${
                isPlaying
                  ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                  : 'bg-[#a3e635] text-[#052e16] hover:bg-[#bef264]'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={15} /> Jeda Otomatis
                </>
              ) : (
                <>
                  <Play size={15} /> Putar Otomatis
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              title="Slide Berikutnya"
              className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={handleReset}
              title="Ulangi dari Slide 1"
              className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="text-xs text-[#9bb7a8] font-medium">
            Gunakan tombol <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white">Jeda</kbd> untuk membaca teks slide secara statis.
          </div>
        </div>
      </div>
    </div>
  )
}
