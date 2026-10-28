'use client'

import React, { useState, useEffect } from 'react'
import {
  Mail,
  Server,
  Key,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  X,
  Activity,
  Sparkles,
  Send,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Building,
  User as UserIcon,
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { useToast, inputCls } from './ui-bits'
import { ModalPortal } from './modal-portal'

interface SmtpSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: Account
  onSaved?: () => void
  initialScope?: 'account' | 'dept'
}

const PRESETS = [
  {
    name: 'Google / Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    note: 'Gunakan 16-digit App Password',
  },
  {
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    note: 'Gunakan SMTP Auth',
  },
  {
    name: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    note: 'Gunakan App Password Yahoo',
  },
]

export function SmtpSettingsModal({
  isOpen,
  onClose,
  user,
  onSaved,
  initialScope = 'account',
}: SmtpSettingsModalProps) {
  const notify = useToast()

  const [scope, setScope] = useState<'account' | 'dept'>(initialScope)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const [hasCustomConfig, setHasCustomConfig] = useState(false)
  const [hasExistingPass, setHasExistingPass] = useState(false)
  const [testRecipient, setTestRecipient] = useState(user.email || '')
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [pingResult, setPingResult] = useState<{ success: boolean; msg: string; latencyMs?: number } | null>(null)

  const [form, setForm] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    from: '',
    secure: false,
  })

  const currentScopeId = scope === 'account' ? user.username : (user.dept || 'PGA')

  const loadScopeConfig = async (targetScope: 'account' | 'dept') => {
    setLoading(true)
    setTestResult(null)
    setPingResult(null)
    try {
      const targetId = targetScope === 'account' ? user.username : (user.dept || 'PGA')
      const res = await fetch(`/api/smtp?scope=${targetScope}&id=${encodeURIComponent(targetId)}&exact=true`)
      const data = await res.json()

      if (data.ok && data.isConfigured && data.config) {
        setHasCustomConfig(true)
        setHasExistingPass(!!data.config.hasPassword)
        setForm({
          host: data.config.host || 'smtp.gmail.com',
          port: Number(data.config.port) || 587,
          user: data.config.user || '',
          pass: data.config.pass || '',
          from: data.config.from || '',
          secure: !!data.config.secure,
        })
      } else {
        // Belum ada konfigurasi khusus untuk scope ini
        setHasCustomConfig(false)
        setHasExistingPass(false)
        setForm({
          host: 'smtp.gmail.com',
          port: 587,
          user: user.email || '',
          pass: '',
          from: `${user.name} <${user.email || ''}>`,
          secure: false,
        })
      }
    } catch (err) {
      console.error('Gagal memuat SMTP scope:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadScopeConfig(scope)
      if (user.email) setTestRecipient(user.email)
    }
  }, [isOpen, scope])

  if (!isOpen) return null

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      host: p.host,
      port: p.port,
      secure: p.secure,
    }))
    notify(`Preset "${p.name}" diterapkan. Silakan isi Akun & App Password Anda.`)
  }

  const handlePing = async () => {
    if (!form.host || !form.user || (!form.pass && !hasExistingPass)) {
      notify('Lengkapi Host, Akun Email, dan App Password untuk uji koneksi', 'error')
      return
    }

    setPinging(true)
    setPingResult(null)
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ping',
          scope,
          scopeId: currentScopeId,
          host: form.host,
          port: form.port,
          user: form.user,
          pass: form.pass,
          secure: form.secure,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setPingResult({ success: true, msg: data.message, latencyMs: data.latencyMs })
        notify('Koneksi SMTP berhasil terhubung!')
      } else {
        setPingResult({ success: false, msg: data.error || 'Koneksi SMTP gagal' })
        notify(data.error || 'Koneksi gagal', 'error')
      }
    } catch (err: any) {
      setPingResult({ success: false, msg: err?.message || 'Gagal menghubungi server' })
      notify('Gagal menghubungi server', 'error')
    } finally {
      setPinging(false)
    }
  }

  const handleTestSend = async () => {
    if (!testRecipient.trim()) {
      notify('Alamat email tujuan tes wajib diisi', 'error')
      return
    }

    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          scope,
          scopeId: currentScopeId,
          host: form.host,
          port: form.port,
          user: form.user,
          pass: form.pass,
          from: form.from || form.user,
          secure: form.secure,
          testRecipient: testRecipient.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ success: true, msg: data.message })
        notify('Email uji coba berhasil dikirim!')
      } else {
        setTestResult({ success: false, msg: data.error || 'Gagal mengirim email tes' })
        notify(data.error || 'Gagal mengirim email tes', 'error')
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: err?.message || 'Gagal memproses pengiriman tes' })
      notify('Gagal mengirim email tes', 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.host || !form.user) {
      notify('Host SMTP dan Akun Email wajib diisi', 'error')
      return
    }
    if (!form.pass && !hasExistingPass) {
      notify('Password / App Password wajib diisi', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          scope,
          scopeId: currentScopeId,
          host: form.host,
          port: form.port,
          user: form.user,
          pass: form.pass,
          from: form.from || form.user,
          secure: form.secure,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        notify(
          scope === 'account'
            ? `SMTP Akun (${user.username}) berhasil disimpan! Email permohonan Anda kini dikirim dari akun ini.`
            : `SMTP Departemen (${user.dept}) berhasil disimpan untuk seluruh pengaju departemen!`
        )
        setHasCustomConfig(true)
        if (onSaved) onSaved()
        onClose()
      } else {
        notify(data.error || 'Gagal menyimpan konfigurasi', 'error')
      }
    } catch (err: any) {
      notify(err?.message || 'Terjadi kesalahan sistem saat menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus konfigurasi SMTP kustom untuk ${scope === 'account' ? `akun "${user.username}"` : `departemen "${user.dept}"`}? Sistem akan otomatis kembali menggunakan email default Pool GA.`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          scope,
          scopeId: currentScopeId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        notify('Konfigurasi kustom berhasil dihapus. Kembali ke default Pool GA.')
        setHasCustomConfig(false)
        loadScopeConfig(scope)
        if (onSaved) onSaved()
      } else {
        notify(data.error || 'Gagal menghapus', 'error')
      }
    } catch (err: any) {
      notify('Gagal menghapus konfigurasi', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-[#061e14] p-6 sm:p-7 shadow-2xl text-[#e8f5ec] max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#a3e635]/15 text-[#a3e635] shadow-sm">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Pengaturan SMTP Email Pengirim
                {hasCustomConfig && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#8fa99b]">
                Email ini digunakan sebagai pengirim saat Anda mengajukan perjalanan ke atasan / manajer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scope Selector Tabs */}
        <div className="pt-4 pb-2 shrink-0">
          <div className="flex items-center rounded-xl border border-white/15 bg-black/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setScope('account')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition ${
                scope === 'account'
                  ? 'bg-[#075b3d] text-white shadow-md'
                  : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
              }`}
            >
              <UserIcon size={14} />
              Akun Pribadi ({user.username})
            </button>
            <button
              type="button"
              onClick={() => setScope('dept')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition ${
                scope === 'dept'
                  ? 'bg-[#075b3d] text-white shadow-md'
                  : 'text-[#8fa99b] hover:text-white hover:bg-white/5'
              }`}
            >
              <Building size={14} />
              Seluruh Dept {user.dept || 'PGA'}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#708078] px-1">
            {scope === 'account'
              ? `Pengaturan khusus untuk akun "${user.username}". Email persetujuan perjalanan dari Anda akan dikirim menggunakan akun ini.`
              : `Pengaturan untuk seluruh pengaju dari departemen "${user.dept || 'PGA'}". Pengaju dari departemen ini yang belum memiliki SMTP pribadi otomatis menggunakan ini.`}
          </p>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 py-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-[#8fa99b]">
              <Loader2 size={18} className="mr-2 animate-spin text-[#a3e635]" /> Memuat konfigurasi SMTP...
            </div>
          ) : (
            <form id="smtp-modal-form" onSubmit={handleSave} className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8fa99b] mb-1.5">
                  Template Penyedia Email Cepat
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-left hover:border-[#a3e635]/50 hover:bg-[#a3e635]/10 transition group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-[#bef264]">{p.name}</p>
                      <p className="text-[10px] text-[#708078] truncate">{p.host}:{p.port}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Server & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                    SMTP Host <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="Contoh: smtp.gmail.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                    Port <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 587 })}
                    placeholder="587"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                    Akun Email Pengirim (Username) <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.user}
                    onChange={(e) => setForm({ ...form, user: e.target.value })}
                    placeholder="nama.departemen@gmail.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                    Password / App Password <span className="text-[#a3e635]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.pass}
                      onChange={(e) => setForm({ ...form, pass: e.target.value })}
                      placeholder={hasExistingPass ? '•••••••••••••••• (Tersimpan)' : '16-digit sandi aplikasi'}
                      className={`${inputCls} pr-10 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa99b] hover:text-white transition"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* From Header */}
              <div>
                <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                  Nama Tampilan Pengirim (From)
                </label>
                <input
                  type="text"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  placeholder={`Contoh: ${user.name} (Admin ${user.dept}) <${form.user || 'email@jai.co.id'}>`}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-[#708078]">
                  Nama yang akan muncul di inbox email manajer/approver ketika menerima permohonan perjalanan.
                </p>
              </div>

              {/* SSL/TLS Option */}
              <label className="flex items-center gap-2 text-xs text-[#8fa99b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.secure}
                  onChange={(e) => setForm({ ...form, secure: e.target.checked })}
                  className="size-4 accent-[#a3e635] rounded"
                />
                Gunakan SSL/TLS Langsung (Biasanya untuk Port 465)
              </label>

              {/* Guide accordion */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs space-y-1.5">
                <div
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex items-center justify-between cursor-pointer text-[#bef264] font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={14} /> Panduan App Password Gmail (Akun Kantor / Pribadi)
                  </span>
                  <span className="text-[10px]">{showGuide ? 'Tutup ▲' : 'Buka ▼'}</span>
                </div>
                {showGuide && (
                  <div className="pt-2 text-[11px] text-[#8fa99b] space-y-1 border-t border-white/10 leading-relaxed">
                    <p>1. Buka akun Google pengirim di <strong>myaccount.google.com/security</strong>.</p>
                    <p>2. Aktifkan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong>.</p>
                    <p>3. Cari menu <strong>App Passwords (Sandi Aplikasi)</strong>.</p>
                    <p>4. Buat sandi aplikasi baru dengan nama <em>JAI-FLEET</em>, lalu copy 16-karakter kode tersebut ke kolom Password di atas.</p>
                  </div>
                )}
              </div>

              {/* Status Feedback Banners */}
              {pingResult && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                    pingResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {pingResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold">{pingResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{pingResult.msg}</p>
                  </div>
                </div>
              )}

              {testResult && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold">{testResult.success ? 'Email Tes Terkirim!' : 'Gagal Mengirim Email Tes'}</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{testResult.msg}</p>
                  </div>
                </div>
              )}

              {/* Testing Tools Section */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2.5">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity size={14} className="text-[#a3e635]" />
                  Pengujian Koneksi &amp; Uji Kirim
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={pinging}
                    onClick={handlePing}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
                  >
                    {pinging ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
                    Uji Handshake (Ping)
                  </button>

                  <div className="flex-1 flex items-center gap-2 w-full">
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="Email tujuan tes (misal: Anda)"
                      className={`${inputCls} text-xs py-1.5`}
                    />
                    <button
                      type="button"
                      disabled={testing}
                      onClick={handleTestSend}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/30 transition disabled:opacity-50"
                    >
                      {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Kirim Tes
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            {hasCustomConfig && (
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
                title="Hapus konfigurasi khusus dan kembali ke default Pool GA"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Reset ke Default
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              form="smtp-modal-form"
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] px-5 py-2 text-xs font-bold text-[#052e16] shadow-lg shadow-[#84cc16]/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Simpan SMTP {scope === 'account' ? 'Akun' : 'Dept'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
