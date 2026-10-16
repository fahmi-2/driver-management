import { createClient } from '@supabase/supabase-js'

export type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure?: boolean
  appUrl?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsoszdwlkqxthwstgyhv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qCNtjue4Y28vgAz4X4CqaA_DNURJiNB'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Mengambil konfigurasi SMTP aktif.
 * Prioritas 1: Dari tabel Supabase `app_settings` (key = 'smtp').
 * Prioritas 2: Fallback dari environment variable (.env / .env.local).
 */
export async function getActiveSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'smtp')
      .maybeSingle()

    if (!error && data?.value && data.value.host && data.value.user && data.value.pass) {
      const v = data.value
      return {
        host: String(v.host).trim(),
        port: Number(v.port) || 587,
        user: String(v.user).trim(),
        pass: String(v.pass),
        from: String(v.from || v.user).trim(),
        secure: Number(v.port) === 465 || !!v.secure,
        appUrl: v.appUrl ? String(v.appUrl).trim() : process.env.NEXT_PUBLIC_APP_URL,
      }
    }
  } catch (err) {
    console.warn('[smtp-config] Gagal membaca dari tabel app_settings:', err)
  }

  // Fallback ke process.env
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT || 587)
    return {
      host: host.trim(),
      port,
      user: user.trim(),
      pass,
      from: (process.env.SMTP_FROM || user).trim(),
      secure: port === 465,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    }
  }

  return null
}

/**
 * Menyimpan konfigurasi SMTP ke tabel Supabase `app_settings`.
 */
export async function saveSmtpConfig(config: SmtpConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: 'smtp',
      value: {
        host: config.host.trim(),
        port: Number(config.port) || 587,
        user: config.user.trim(),
        pass: config.pass,
        from: (config.from || config.user).trim(),
        secure: Number(config.port) === 465 || !!config.secure,
        appUrl: (config.appUrl || '').trim(),
      },
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[smtp-config] Gagal menyimpan ke Supabase:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[smtp-config] Exception simpan ke Supabase:', err)
    return { ok: false, error: err?.message || 'Gagal menyimpan konfigurasi ke Supabase' }
  }
}
