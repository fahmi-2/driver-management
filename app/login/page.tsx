'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { YazakiBadge } from '@/components/yazaki-logo'
import { ACCOUNTS, ROLE_LABEL, findAccount, setSession, type Account } from '@/lib/accounts'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  // Success Transition & Payload State
  const [isSuccess, setIsSuccess] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<Account | null>(null)
  const [progress, setProgress] = useState(0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSuccess) return

    const acc = findAccount(username, password)
    if (!acc) {
      setShakeKey((k) => k + 1)
      return setError('Username atau password salah.')
    }

    // Set session
    setSession(acc.username, remember)
    setLoggedInUser(acc)
    setIsSuccess(true)
    setError('')

    // Animasi progress bar & transisi ke dashboard
    let cur = 0
    const interval = setInterval(() => {
      cur += 25
      setProgress(Math.min(cur, 100))
      if (cur >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          router.replace('/')
        }, 350)
      }
    }, 150)
  }

  const inputWrap = 'relative rounded-2xl bg-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,.15),0_1px_0_rgba(255,255,255,.9)] ring-1 ring-white/80 transition-all duration-200 hover:bg-white/80 focus-within:bg-white/95 focus-within:ring-2 focus-within:ring-[#4d7c0f]'
  const inputCls = 'login-input h-11 w-full rounded-2xl bg-transparent pl-10 pr-10 text-sm font-semibold text-[#052313] placeholder:text-[#2d4a39] outline-none !shadow-none !border-0'

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b1f15] p-4 sm:p-8">
      {/* blurred ambient backdrop */}
      <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl" style={{ backgroundImage: 'url(/login-car.jpg)' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06170e]/70 via-[#0b2416]/50 to-[#04110a]/80" />

      <h1 className="anim-fade-up relative z-10 mb-6 text-xl font-bold tracking-tight text-[#e8f5ec] sm:text-2xl">
        JAI-FLEET Management · <span className="text-[#a3e635]">Log In</span>
      </h1>

      {/* Main framed card with car photo */}
      <div
        className={`anim-fade-up relative z-10 w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/25 shadow-[0_40px_80px_-20px_rgba(0,0,0,.75)] transition-all duration-700 ${isSuccess ? 'scale-[1.01] shadow-[0_0_80px_rgba(163,230,53,0.35)]' : ''
          }`}
        style={{ animationDelay: '.1s' }}
      >
        <div className="login-bg absolute inset-0 bg-cover bg-[12%_center]" style={{ backgroundImage: 'url(/login-car.jpg)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-[#052e16]/40" />

        <div className="relative grid min-h-[540px] items-center gap-6 p-6 sm:p-10 md:grid-cols-[1fr_390px] lg:grid-cols-[1fr_400px]">
          {/* Brand & Left Details */}
          <div className="hidden self-start pt-6 md:block">
            <div className="flex items-center gap-3">
              <YazakiBadge className="h-12 px-3 shadow-2xl" />
              <div>
                <span className="block text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.6)]">JAI-FLEET Management</span>
                <span className="block text-sm font-semibold text-[#a3e635] drop-shadow-[0_2px_8px_rgba(0,0,0,.7)]">Gas Operations -Yazaki</span>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-sm font-medium text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,.7)]">
              Manajemen armada &amp; driver pabrik PT Yazaki — alokasi kendaraan, gerbang, dan klaim dalam satu sistem.
            </p>
          </div>

          {/* Glass Card Container (Form / Success Payload Modal) */}
          <div className="relative">
            {/* 1. Login Form */}
            <form
              key={shakeKey}
              onSubmit={submit}
              className={`relative rounded-[26px] border border-white/50 bg-white/35 p-7 shadow-[0_30px_60px_-15px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.7)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-500 ${isSuccess ? 'pointer-events-none scale-95 opacity-0 blur-sm' : ''
                } ${shakeKey ? 'anim-shake' : 'anim-fade-up'}`}
              style={{ animationDelay: '.25s' }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#052313]">Masuk ke Akun</h2>
                <p className="mt-1 text-xs font-semibold text-[#183925]">Gunakan akun sesuai peran Anda</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className={inputWrap}>
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0f3d24]" />
                  <input id="username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputCls} required />
                </div>
                <div className={inputWrap}>
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0f3d24]" />
                  <input id="password" type={show ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} required />
                  <button type="button" aria-label="Tampilkan password" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0f3d24] transition hover:text-[#052313] hover:scale-110">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[#052313] cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-3.5 accent-[#166534]" />
                Ingat saya
              </label>

              {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/85 px-3 py-2 text-xs font-medium text-white">{error}</p>}

              <button id="login-submit" className="group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0b2416] text-sm font-bold text-[#d9f99d] shadow-[0_10px_20px_-6px_rgba(5,46,22,.7)] transition hover:-translate-y-0.5 hover:bg-[#052e16]">
                Masuk <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>

              <div className="my-4 flex items-center gap-3 text-[10px] font-medium text-[#1f3b2b]">
                <span className="h-px flex-1 bg-[#0b2416]/30" />Akun demo (klik untuk mengisi)<span className="h-px flex-1 bg-[#0b2416]/30" />
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {ACCOUNTS.filter((a, i, arr) => arr.findIndex((x) => x.role === a.role) === i || a.role === 'requester').map((a) => (
                  <button
                    type="button"
                    key={a.username}
                    title={`${a.username} / ${a.password}`}
                    onClick={() => { setUsername(a.username); setPassword(a.password); setError('') }}
                    className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold text-[#0b2416] ring-1 ring-white/70 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#a3e635] hover:ring-[#84cc16]"
                  >
                    {ROLE_LABEL[a.role]} · {a.username}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-[#1f3b2b]">SPV tidak login: approval lewat Magic Link email.</p>
            </form>

            {/* 2. Success Payload / Transition Overlay */}
            {isSuccess && loggedInUser && (
              <div className="anim-success-pop absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[26px] border border-white/60 bg-gradient-to-b from-white/90 via-white/80 to-[#ecfdf5]/90 p-7 text-center shadow-[0_30px_70px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                {/* Glowing Success Badge */}
                <div className="relative mb-3 flex size-16 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-[#84cc16]/30" />
                  <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#65a30d] to-[#a3e635] text-white shadow-lg shadow-[#84cc16]/40">
                    <CheckCircle2 size={32} className="stroke-[2.5]" />
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-[#052e16]">Autentikasi Berhasil!</h3>
                <p className="mt-0.5 text-xs text-[#2d503b]">Menyiapkan sesi kerja Anda...</p>

                {/* User Payload Info Card */}
                <div className="mt-4 w-full rounded-2xl border border-[#a3e635]/40 bg-[#062417]/95 p-3.5 text-left text-white shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#a3e635] font-bold text-[#052e16] shadow-sm">
                      {loggedInUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-bold text-white">{loggedInUser.name}</p>
                        <span className="shrink-0 rounded-full bg-[#a3e635]/20 px-2 py-0.2 text-[9px] font-extrabold text-[#a3e635] ring-1 ring-[#a3e635]/40">
                          {ROLE_LABEL[loggedInUser.role]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-[#9bb7a8]">{loggedInUser.title}</p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-[#9bb7a8]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-[#a3e635]" />
                      Sesi Terverifikasi
                    </span>
                    <span className="font-mono text-[9px] text-[#bef264]">{loggedInUser.dept}</span>
                  </div>
                </div>

                {/* Animated Progress Bar & Redirect Info */}
                <div className="mt-5 w-full">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-[#0f3d23]">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin text-[#65a30d]" />
                      Mengarahkan ke Dashboard...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#052e16]/15 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#84cc16] to-[#a3e635] shadow-[0_0_12px_rgba(163,230,53,0.8)] transition-all duration-200 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
