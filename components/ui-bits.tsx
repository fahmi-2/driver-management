'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { CouponStatus, TripStatus } from '@/lib/store'

const TONES: Record<string, string> = {
  green: 'bg-[#a3e635]/15 text-[#bef264] ring-1 ring-[#a3e635]/30',
  blue: 'bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30',
  gray: 'bg-white/10 text-slate-300 ring-1 ring-white/10',
  amber: 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30',
  red: 'bg-red-400/15 text-red-300 ring-1 ring-red-400/30',
  purple: 'bg-violet-400/15 text-violet-300 ring-1 ring-violet-400/30',
}

export function Pill({ label, tone = 'gray' }: { label: string; tone?: keyof typeof TONES | string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${TONES[tone] ?? TONES.gray}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export const tripTone = (s: TripStatus) =>
  ({ WAITING_SPV: 'amber', WAITING_ASSIGN: 'purple', READY: 'green', ON_TRIP: 'blue', DONE: 'gray', REJECTED: 'red' })[s]
export const couponTone = (s: CouponStatus) =>
  ({ NONE: 'gray', VOID: 'red', CLAIMABLE: 'green', CLAIMED: 'amber', PAID: 'blue' })[s]

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`anim-fade-up rounded-2xl bg-white ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ee] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-[11px] text-[#93a097]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="anim-fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="mb-2 text-[11px] font-medium text-[#8fa99b]">{desc}</p>
        <h1 className="text-[30px] font-extrabold tracking-[-.04em] text-white">{title}<span className="text-[#a3e635]">.</span></h1>
      </div>
      {action}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="px-5 py-10 text-center text-xs text-[#93a097]">{text}</div>
}

export const btnPrimary = 'btn-lime inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50'
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-full border border-[#a3e635]/30 px-4 py-2.5 text-xs font-bold text-[#a3e635] transition hover:bg-[#a3e635]/10 hover:border-[#a3e635]/60 disabled:opacity-50'
export const inputCls = 'mt-1.5 h-10 w-full rounded-lg border border-[#a3e635]/15 bg-black/25 px-3 text-xs font-normal outline-none'
export const thCls = 'px-4 py-3 text-[10px] font-semibold uppercase tracking-[.1em] text-[#8fa99b] whitespace-nowrap'
export const tdCls = 'px-4 py-3 text-xs whitespace-nowrap'

// ---------- toast ----------
const ToastCtx = createContext<(m: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const notify = useCallback((m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(''), 2800)
  }, [])
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {msg && (
        <div role="status" className="anim-fade-up glass fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium text-white">
          <Check size={15} className="text-[#a3e635]" />
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}
