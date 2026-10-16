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
} from 'lucide-react'
import type { Account } from '@/lib/accounts'
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [testRecipient, setTestRecipient] = useState(user?.email || '')
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [hasExistingPass, setHasExistingPass] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [showSqlGuide, setShowSqlGuide] = useState(false)

  const [form, setForm] = useState<SmtpForm>({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    from: '',
    secure: false,
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://gaspoll.cloud',
  })

  // Ambil konfigurasi tersimpan saat pertama kali dibuka
  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/smtp')
      const data = await res.json()
      if (data.ok && data.config) {
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
    loadConfig()
  }, [])

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

    setSaving(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          ...form,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Gagal menyimpan konfigurasi')
      }

      notify('Konfigurasi SMTP berhasil disimpan ke database!', 'success')
      setHasExistingPass(true)
    } catch (err: any) {
      notify(err.message, 'error')
      if (err.message.includes('app_settings')) {
        setShowSqlGuide(true)
      }
    } finally {
      setSaving(false)
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
        desc="Atur server SMTP dan akun pengirim agar notifikasi approval otomatis dapat terkirim tanpa hardcode file konfigurasi."
        action={
          <button
            type="button"
            onClick={loadConfig}
            disabled={loading}
            className={`${btnGhost} !py-1.5 !px-3 text-xs`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Muat Ulang
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Formulir Pengaturan SMTP */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Konfigurasi Server Email"
            subtitle="Pilih penyedia email atau masukkan host SMTP internal perusahaan"
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
                      const port = Number(e.target.value)
                      setForm({
                        ...form,
                        port,
                        secure: port === 465,
                      })
                    }}
                    placeholder="587 / 465"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>
              </div>

              {/* SSL/TLS Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="secure-toggle"
                  checked={form.secure}
                  onChange={(e) => setForm({ ...form, secure: e.target.checked })}
                  className="size-4 rounded border-white/20 bg-black/40 text-[#a3e635] focus:ring-0"
                />
                <label htmlFor="secure-toggle" className="text-xs font-medium text-[#c4d4cc] cursor-pointer">
                  Gunakan Enkripsi Langsung SSL/TLS (Wajib dicentang untuk Port 465, biarkan kosong untuk Port 587 STARTTLS)
                </label>
              </div>

              {/* Username & Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Username / Email Pengirim <span className="text-[#a3e635]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type="text"
                      value={form.user}
                      onChange={(e) => setForm({ ...form, user: e.target.value })}
                      placeholder="poolga.jai@gmail.com"
                      className={`${inputCls} !mt-0 pl-9 font-mono`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Password / App Password <span className="text-[#a3e635]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Key size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.pass}
                      onChange={(e) => setForm({ ...form, pass: e.target.value })}
                      placeholder={hasExistingPass ? '•••••••••••••••• (Tersimpan)' : '16-digit App Password'}
                      className={`${inputCls} !mt-0 pl-9 pr-10 font-mono`}
                      required={!hasExistingPass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-2.5 text-[#708078] hover:text-white transition"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {hasExistingPass && (
                    <p className="mt-1 text-[10px] text-[#8fa99b]">
                      * Kosongkan jika tidak ingin mengubah password yang tersimpan sebelumnya.
                    </p>
                  )}
                </div>
              </div>

              {/* Sender Name & Base URL */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    Label / Nama Pengirim (From Header)
                  </label>
                  <input
                    type="text"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    placeholder={`Pool GA PT. JAI <${form.user || 'poolga@gmail.com'}>`}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[10px] text-[#708078]">
                    Teks yang tampil di kolom pengirim email penerima.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa99b]">
                    URL Aplikasi Web (Untuk Link Approval)
                  </label>
                  <div className="relative mt-1.5">
                    <Globe size={15} className="absolute left-3 top-3 text-[#708078]" />
                    <input
                      type="url"
                      value={form.appUrl}
                      onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
                      placeholder="https://gaspoll.cloud"
                      className={`${inputCls} !mt-0 pl-9 font-mono`}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[#708078]">
                    Link yang disematkan ke dalam tombol email approval.
                  </p>
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <p className="text-[11px] text-[#708078]">
                  Perubahan akan langsung aktif untuk pengiriman berikutnya.
                </p>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className={`${btnPrimary} !px-6`}
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
