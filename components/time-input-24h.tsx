'use client'

import React, { useId, useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimeInput24hProps {
  value?: string
  onChange: (val: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  name?: string
  id?: string
  placeholder?: string
  suffix?: string
}

/**
 * TimeInput24h:
 * Komponen Input Jam Khusus Format 24 Jam (00:00 - 23:59 WIB / Jam Indonesia).
 *
 * Menggantikan input HTML5 `type="time"` standar browser yang sering kali
 * otomatis memunculkan switcher AM/PM jika OS / device pengguna berbahasa English (US).
 * Menjamin 100% konsisten 24 jam di semua device, laptop, tablet, dan smartphone.
 */
export function TimeInput24h({
  value = '',
  onChange,
  disabled = false,
  required = false,
  className = '',
  name,
  id,
  suffix = 'WIB',
}: TimeInput24hProps) {
  const autoId = useId()
  const inputId = id || autoId
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Normalize initial value
  const safeValue = value && value.includes(':') ? value.trim().substring(0, 5) : value

  // Parse hours and minutes
  const parts = (safeValue || '08:00').split(':')
  const curH = parts[0]?.padStart(2, '0') || '08'
  const curM = parts[1]?.padStart(2, '0') || '00'

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Direct typing handler (auto-formats as HH:mm)
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '')

    // If user deleted colon
    if (raw.length === 2 && !raw.includes(':') && !e.target.value.endsWith(':')) {
      // Allow user to type 2 digits
    } else if (raw.length === 3 && !raw.includes(':')) {
      raw = `${raw.substring(0, 2)}:${raw.substring(2)}`
    }

    // Max 5 chars HH:mm
    if (raw.length > 5) raw = raw.substring(0, 5)

    onChange(raw)
  }

  const handleBlur = () => {
    if (!safeValue) return
    // Auto validate & snap on blur
    const p = safeValue.split(':')
    let h = parseInt(p[0] || '0', 10)
    let m = parseInt(p[1] || '0', 10)

    if (isNaN(h)) h = 0
    if (isNaN(m)) m = 0

    if (h < 0) h = 0
    if (h > 23) h = 23
    if (m < 0) m = 0
    if (m > 59) m = 59

    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    onChange(formatted)
  }

  const handleSelectTime = (h: number, m: number) => {
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    onChange(formatted)
    setIsOpen(false)
  }

  // Quick preset hours (05:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 15, 30, 45]

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div className="relative flex items-center">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
          placeholder="08:00"
          required={required}
          disabled={disabled}
          value={safeValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className={`w-full font-mono text-sm tracking-wide pr-16 ${className}`}
        />
        <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-auto">
          {suffix && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50 select-none">
              {suffix}
            </span>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            title="Pilih Jam (Format 24 Jam)"
            className="rounded p-1 text-white/60 hover:text-[#a3e635] hover:bg-white/10 transition"
          >
            <Clock size={15} />
          </button>
        </div>
      </div>

      {/* Quick 24h Picker Popover */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-64 rounded-xl border border-white/15 bg-[#0a2418] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 left-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Clock size={13} className="text-[#a3e635]" />
              Pilih Jam (Format 24 Jam)
            </span>
            <span className="text-[10px] font-extrabold text-[#bef264] bg-[#a3e635]/20 px-1.5 py-0.5 rounded">
              {curH}:{curM} WIB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Hour column */}
            <div>
              <span className="text-[10px] font-bold text-white/50 uppercase block mb-1">Jam (00-23)</span>
              <div className="h-40 overflow-y-auto space-y-1 pr-1 custom-scroll">
                {hours.map((h) => {
                  const strH = String(h).padStart(2, '0')
                  const isSel = strH === curH
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectTime(h, parseInt(curM, 10))}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-mono font-bold transition flex items-center justify-between ${
                        isSel
                          ? 'bg-[#a3e635] text-[#052e16]'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{strH}:00</span>
                      {isSel && <span className="text-[9px]">●</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Minute column */}
            <div>
              <span className="text-[10px] font-bold text-white/50 uppercase block mb-1">Menit</span>
              <div className="h-40 overflow-y-auto space-y-1 pr-1 custom-scroll">
                {minutes.map((m) => {
                  const strM = String(m).padStart(2, '0')
                  const isSel = strM === curM
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectTime(parseInt(curH, 10), m)}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-mono font-bold transition flex items-center justify-between ${
                        isSel
                          ? 'bg-[#a3e635] text-[#052e16]'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>:{strM}</span>
                      {isSel && <span className="text-[9px]">●</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => handleSelectTime(8, 0)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90"
            >
              08:00
            </button>
            <button
              type="button"
              onClick={() => handleSelectTime(12, 0)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90"
            >
              12:00
            </button>
            <button
              type="button"
              onClick={() => handleSelectTime(13, 0)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90"
            >
              13:00
            </button>
            <button
              type="button"
              onClick={() => handleSelectTime(17, 0)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90"
            >
              17:00
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

