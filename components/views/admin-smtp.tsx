'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  Server,
  Key,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Activity,
  Wifi,
  Building,
  User as UserIcon,
  Trash2,
} from 'lucide-react'
import { DEPARTMENTS, getAllAccounts, type Account } from '@/lib/accounts'
import type { SmtpScope } from '@/lib/smtp-config'
import { Card, PageHeader, btnGhost, btnPrimary, inputCls, useToast } from '../ui-bits'

type SmtpForm = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure: boolean
  appUrl: string
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

export function AdminSmtpSettings({ user }: { user: Account }) {
  const notify = useToast()

  // Target scope: 'global' (Pusat Pool GA) | 'dept' (Per Departemen) | 'account' (Per Akun Requester)
  const [targetScope, setTargetScope] = useState<SmtpScope>('global')
  const [selectedDept, setSelectedDept] = useState<string>('PGA')
  const [selectedUsername, setSelectedUsername] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [testRecipient, setTestRecipient] = useState(user?.email || '')
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [pingResult, setPingResult] = useState<{ success: boolean; msg: string; latencyMs?: number } | null>(null)
  const [hasExistingPass, setHasExistingPass] = useState(false)
  const [hasCustomConfig, setHasCustomConfig] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [showSqlGuide, setShowSqlGuide] = useState(false)

  const allAccounts = getAllAccounts()

  const [form, setForm] = useState<SmtpForm>({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    from: '',
    secure: false,
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://gaspoll.cloud',
  })

  const currentScopeId =
    targetScope === 'dept' ? selectedDept : targetScope === 'account' ? selectedUsername : undefined

  // Ambil konfigurasi tersimpan berdasarkan target scope
  const loadConfig = async (overrideScope?: SmtpScope, overrideId?: string) => {
    const sc = overrideScope ?? targetScope
    const id = overrideId ?? (sc === 'dept' ? selectedDept : sc === 'account' ? selectedUsername : undefined)

    if (sc === 'account' && !id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setTestResult(null)
    setPingResult(null)
    try {
      const q = new URLSearchParams()
      q.set('scope', sc)
      if (id) q.set('id', id)
      q.set('exact', 'true')

      const res = await fetch(`/api/smtp?${q.toString()}`)
      const data = await res.json()
      if (data.ok && data.config) {
        setHasCustomConfig(!!data.isConfigured)
        setForm({
          host: data.config.host || 'smtp.gmail.com',
          port: Number(data.config.port) || 587,
          user: data.config.user || '',
          pass: data.config.pass || '',
          from: data.config.from || '',
          secure: !!data.config.secure,
          appUrl: data.config.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://gaspoll.cloud'),
        })
        setHasExistingPass(!!data.config.hasPassword)
      }
    } catch (err: any) {
      console.error('Gagal mengambil konfigurasi SMTP:', err)
      notify('Gagal memuat konfigurasi SMTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig(targetScope, currentScopeId)
  }, [targetScope, selectedDept, selectedUsername])

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setForm((prev) => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
    }))
    notify(`Preset ${preset.name} diterapkan`)
  }

  // Simpan konfigurasi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.host.trim()) {
      notify('Host SMTP wajib diisi!', 'error')
      return
    }
    if (!form.user.trim()) {
      notify('Username / Email SMTP wajib diisi!', 'error')
      return
    }
    if (!form.pass.trim() && !hasExistingPass) {
      notify('Password / App Password wajib diisi!', 'error')
      return
    }
    if (targetScope === 'account' && !selectedUsername) {
      notify('Pilih akun requester target terlebih dahulu!', 'error')
      return
    }

    setSaving(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          scope: targetScope,
          scopeId: currentScopeId,
          ...form,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Gagal menyimpan konfigurasi')
      }

      notify(
        targetScope === 'global'
          ? 'Konfigurasi SMTP Global berhasil disimpan!'
          : `Konfigurasi SMTP untuk ${targetScope === 'dept' ? `Departemen ${selectedDept}` : `Akun ${selectedUsername}`} berhasil disimpan!`,
        'success'
      )
      setHasExistingPass(true)
      setHasCustomConfig(true)
    } catch (err: any) {
      notify(err.message, 'error')
      if (err.message.includes('app_settings')) {
        setShowSqlGuide(true)
      }
    } finally {
      setSaving(false)
    }
  }

  // Hapus konfigurasi kustom (revert ke fallback global)
  const handleDeleteCustom = async () => {
    if (targetScope === 'global') return
    const targetLabel = targetScope === 'dept' ? `Departemen ${selectedDept}` : `Akun ${selectedUsername}`
    if (!confirm(`Hapus setting SMTP khusus untuk ${targetLabel} dan gunakan fallback SMTP Global Pool GA?`)) return

    setDeleting(true)
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          scope: targetScope,
          scopeId: currentScopeId,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Gagal menghapus konfigurasi')

      notify(`Konfigurasi SMTP ${targetLabel} dihapus. Sistem akan menggunakan fallback global.`, 'success')
      loadConfig(targetScope, currentScopeId)
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Test koneksi server SMTP (Ping / Handshake & Auth check)
  const handlePing = async () => {
    if (!form.host.trim()) {
      notify('Host SMTP wajib diisi!', 'error')
      return
    }
    if (!form.user.trim()) {
      notify('Username / Email SMTP wajib diisi!', 'error')
      return
    }
    if (!form.pass.trim() && !hasExistingPass) {
      notify('Password / App Password wajib diisi!', 'error')
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
          scope: targetScope,
          scopeId: currentScopeId,
          ...form,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Gagal terhubung ke server SMTP')
      }

      setPingResult({
        success: true,
        msg: json.message,
        latencyMs: json.latencyMs,
      })
      notify('Koneksi SMTP Berhasil!', 'success')
    } catch (err: any) {
      setPingResult({
        success: false,
        msg: err.message || 'Gagal terhubung ke server SMTP. Periksa host, port, atau kredensial login.',
      })
      notify('Koneksi SMTP gagal', 'error')
    } finally {
      setPinging(false)
    }
  }

  // Uji coba kirim email
  const handleTest = async () => {
    if (!testRecipient.trim()) {
      notify('Masukkan email tujuan untuk uji coba!', 'error')
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
          scope: targetScope,
          scopeId: currentScopeId,
          ...form,
          testRecipient: testRecipient.trim(),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Uji coba gagal')
      }

      setTestResult({
        success: true,
        msg: json.message || `Email uji coba berhasil dikirim ke ${testRecipient}`,
      })
      notify('Email uji coba berhasil dikirim!', 'success')
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || 'Gagal mengirim email uji coba. Periksa kredensial atau koneksi SMTP.',
      })
      notify('Uji coba kirim email gagal', 'error')
    } finally {
      setTesting(false)
    }
  }

  const copySqlCode = () => {
    const sql = `CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on app_settings" ON app_settings;
CREATE POLICY "Allow public all access on app_settings" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`

    navigator.clipboard.writeText(sql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
    notify('Query SQL disalin ke clipboard')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan SMTP Email"
        desc="Atur server SMTP dan akun pengirim agar notifikasi approval otomatis dapat terkirim dari email departemen masing-masing."
        action={
          <button
            type="button"
            onClick={() => loadConfig(targetScope, currentScopeId)}
            disabled={loading}
            className={`${btnGhost} !py-1.5 !px-3 text-xs`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Muat Ulang
          </button>
        }
      />

      {/* Target Scope Switcher (Global vs Departemen vs Akun) */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1712]/90 p-4 backdrop-blur-md space-y-3.5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles size={14} className="text-[#a3e635]" /> Lingkup Konfigurasi Pengirim (Hierarki SMTP)
            </p>
            <p className="text-[11px] text-[#8fa99b] mt-0.5">
              Email approval otomatis memprioritaskan akun pengaju &rarr; departemen pengaju &rarr; fallback Global Pool GA.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-black/40 border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setTargetScope('global')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                targetScope === 'global'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              <Globe size={13} /> Global (Pool GA)
            </button>
            <button
              type="button"
              onClick={() => setTargetScope('dept')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                targetScope === 'dept'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              <Building size={13} /> Per Departemen
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetScope('account')
                if (!selectedUsername && allAccounts.length > 0) {
                  const req = allAccounts.find((a) => a.role === 'requester') || allAccounts[0]
                  if (req) setSelectedUsername(req.username)
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                targetScope === 'account'
                  ? 'bg-[#a3e635] text-[#052e16] shadow-xs'
                  : 'text-[#8fa99b] hover:text-white'
              }`}
            >
              <UserIcon size={13} /> Per Akun
            </button>
          </div>
        </div>

        {/* Sub-selector jika memilih Scope Departemen atau Akun */}
        {targetScope !== 'global' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-white/5">
            {targetScope === 'dept' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-[#8fa99b] shrink-0">Pilih Departemen:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className={`${inputCls} !mt-0 !py-1.5 !px-3 bg-black/50 text-xs text-white font-bold w-full sm:w-48`}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className="bg-[#0f1f17] text-white">
                      Departemen {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetScope === 'account' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-[#8fa99b] shrink-0">Pilih Akun:</span>
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className={`${inputCls} !mt-0 !py-1.5 !px-3 bg-black/50 text-xs text-white font-bold w-full sm:w-64 truncate`}
                >
                  {allAccounts.map((a) => (
                    <option key={a.username} value={a.username} className="bg-[#0f1f17] text-white">
                      {a.name} ({a.username}) · {a.dept || 'Umum'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              {hasCustomConfig ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 size={12} /> Konfigurasi Khusus Tersimpan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  <AlertCircle size={12} /> Belum ada konfigurasi khusus (Mewarisi Fallback Global)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Formulir Pengaturan SMTP */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={
              targetScope === 'global'
                ? 'Konfigurasi SMTP Global (Pool GA)'
                : targetScope === 'dept'
                ? `Konfigurasi SMTP Khusus Departemen: ${selectedDept}`
                : `Konfigurasi SMTP Khusus Akun: ${selectedUsername}`
            }
            subtitle={
              targetScope === 'global'
                ? 'Server default yang digunakan jika requester/departemen belum mengatur SMTP mandiri'
                : 'Pengajuan dari requester ini akan dikirimkan otomatis menggunakan kredensial email ini ke Manajer'
            }
            action={
              targetScope !== 'global' && hasCustomConfig ? (
                <button
                  type="button"
                  onClick={handleDeleteCustom}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition py-1 px-2 rounded-lg hover:bg-red-950/30"
                >
                  <Trash2 size={13} />
                  {deleting ? 'Menghapus...' : 'Hapus Khusus (Revert ke Global)'}
                </button>
              ) : undefined
            }
          >
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
              {/* Presets Button */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8fa99b] mb-2">
                  Preset Cepat Penyedia Email:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = form.host === p.host && form.port === p.port
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-[#a3e635] bg-[#a3e635]/15 text-[#bef264]'
                            : 'border-white/10 bg-black/20 text-[#8fa99b] hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <Sparkles size={12} className={isSelected ? 'text-[#a3e635]' : 'opacity-40'} />
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Host & Port */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    SMTP Host <span className="text-[#a3e635]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Server size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type="text"
                      value={form.host}
                      onChange={(e) => setForm({ ...form, host: e.target.value })}
                      placeholder="contoh: smtp.gmail.com"
                      className={`${inputCls} !mt-0 pl-9 font-mono`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Port <span className="text-[#a3e635]">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 587
                      setForm({ ...form, port: p, secure: p === 465 })
                    }}
                    placeholder="587"
                    className={`${inputCls} font-mono`}
                    required
                  />
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[#708078]">
                    <span>Biasanya:</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, port: 587, secure: false })}
                      className="text-[#a3e635] hover:underline"
                    >
                      587 (TLS)
                    </button>
                    <span>atau</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, port: 465, secure: true })}
                      className="text-[#a3e635] hover:underline"
                    >
                      465 (SSL)
                    </button>
                  </div>
                </div>
              </div>

              {/* User & Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Username / Email Pengirim <span className="text-[#a3e635]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type="email"
                      value={form.user}
                      onChange={(e) => setForm({ ...form, user: e.target.value })}
                      placeholder="departemen@jai.yazaki.com"
                      className={`${inputCls} !mt-0 pl-9`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#8fa99b]">
                      Password / App Password <span className="text-[#a3e635]">*</span>
                    </label>
                    {hasExistingPass && (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        (Tersimpan di Supabase)
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <Key size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.pass}
                      onChange={(e) => setForm({ ...form, pass: e.target.value })}
                      placeholder={hasExistingPass ? '•••••••••••••••• (tidak diubah)' : 'App Password 16 karakter'}
                      className={`${inputCls} !mt-0 pl-9 pr-9 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3 text-[#708078] hover:text-white"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-[#708078]">
                    Untuk Gmail gunakan 16 digit Sandi Aplikasi (bukan kata sandi akun Google).
                  </p>
                </div>
              </div>

              {/* Sender Name / From Header & App URL */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Format Pengirim (From Header)
                  </label>
                  <input
                    type="text"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    placeholder={
                      targetScope === 'dept'
                        ? `Admin ${selectedDept} <${form.user || 'departemen@jai.yazaki.com'}>`
                        : `Pool GA PT JAI <${form.user || 'gaspoll@jai.yazaki.com'}>`
                    }
                    className={inputCls}
                  />
                  <p className="mt-1 text-[10px] text-[#708078]">
                    Nama tampilan yang dilihat penerima di inbox email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    App URL (Base URL Sistem)
                  </label>
                  <div className="relative mt-1.5">
                    <Globe size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type="url"
                      value={form.appUrl}
                      onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
                      placeholder="https://gaspoll.cloud"
                      className={`${inputCls} !mt-0 pl-9 font-mono text-xs`}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[#708078]">
                    Link yang disematkan ke dalam tombol email approval.
                  </p>
                </div>
              </div>

              {/* Hasil Uji Koneksi Langsung (Ping / Handshake) */}
              {pingResult && (
                <div
                  className={`rounded-xl border p-4 text-xs anim-fade-up ${
                    pingResult.success
                      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
                      : 'border-rose-500/30 bg-rose-950/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {pingResult.success ? (
                      <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={17} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">
                          {pingResult.success ? 'Koneksi SMTP Berhasil!' : 'Koneksi SMTP Gagal'}
                        </p>
                        {pingResult.latencyMs != null && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                            Latency: {pingResult.latencyMs} ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed font-mono break-words">
                        {pingResult.msg}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                <p className="text-[11px] text-[#708078]">
                  Uji koneksi terlebih dahulu sebelum menyimpan konfigurasi.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePing}
                    disabled={pinging || saving || loading}
                    className={`${btnGhost} !py-2.5 !px-4 text-xs font-bold gap-2`}
                  >
                    {pinging ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-[#a3e635]" />
                        Menguji Koneksi...
                      </>
                    ) : (
                      <>
                        <Activity size={14} />
                        Test Koneksi
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={saving || loading || pinging}
                    className={`${btnPrimary} !py-2.5 !px-6 text-xs font-bold`}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-black" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        Simpan Konfigurasi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Kotak Panduan SQL Database jika diperlukan */}
          {(showSqlGuide || !hasExistingPass) && (
            <Card title="Database Setup (Supabase)" subtitle="Tabel penyimpanan konfigurasi sistem">
              <div className="p-5 space-y-3 text-xs text-[#c4d4cc]">
                <p>
                  Konfigurasi disimpan di tabel <code className="bg-black/40 px-1.5 py-0.5 rounded text-[#a3e635]">app_settings</code> di Supabase. Jika Anda belum membuat tabel ini, jalankan query berikut di SQL Editor Supabase:
                </p>
                <div className="relative">
                  <pre className="bg-black/60 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-[#bef264] overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on app_settings" ON app_settings;
CREATE POLICY "Allow public all access on app_settings" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`}
                  </pre>
                  <button
                    type="button"
                    onClick={copySqlCode}
                    className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-[10px] flex items-center gap-1"
                  >
                    {copiedSql ? <Check size={12} className="text-[#a3e635]" /> : <Copy size={12} />}
                    {copiedSql ? 'Tersalin' : 'Salin SQL'}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Kolom Kanan: Uji Coba & Panduan Gmail */}
        <div className="space-y-6">
          {/* Uji Coba Kirim Email */}
          <Card
            title="Uji Coba Kirim Email"
            subtitle="Pastikan server SMTP dapat terhubung dan mengirim pesan"
          >
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa99b] mb-1">
                  Email Penerima Uji Coba
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="emailanda@gmail.com"
                  className={inputCls}
                />
              </div>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !testRecipient}
                className={`${btnPrimary} w-full py-2.5 text-xs disabled:opacity-50`}
              >
                {testing ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    Sedang Menguji Koneksi...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Kirim Email Uji Coba
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`rounded-xl border p-3.5 text-xs ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
                      : 'border-rose-500/30 bg-rose-950/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">
                        {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                      </p>
                      <p className="text-[11px] leading-relaxed break-words font-mono">
                        {testResult.msg}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Panduan Pembuatan App Password Gmail */}
          <Card
            title="Panduan Gmail App Password"
            subtitle="Wajib untuk akun Gmail pribadi / Google Workspace"
          >
            <div className="p-5 space-y-3 text-xs text-[#c4d4cc]">
              <div className="flex items-start gap-2">
                <HelpCircle size={16} className="text-[#a3e635] shrink-0 mt-0.5" />
                <p className="font-semibold text-white">
                  Google melarang login menggunakan password biasa pada SMTP.
                </p>
              </div>

              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-[#93a097] leading-relaxed">
                <li>Buka akun Google Anda di <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" className="text-[#a3e635] underline">myaccount.google.com</a>.</li>
                <li>Masuk ke menu <strong>Keamanan (Security)</strong>.</li>
                <li>Pastikan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> aktif.</li>
                <li>Ketik di kolom pencarian: <strong>Sandi Aplikasi (App Passwords)</strong>.</li>
                <li>Beri nama aplikasi, misal <em>"JAI Fleet"</em>, lalu klik <strong>Buat</strong>.</li>
                <li>Salin 16 karakter yang dihasilkan (tanpa spasi) ke kolom <strong>Password / App Password</strong> di samping.</li>
              </ol>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
