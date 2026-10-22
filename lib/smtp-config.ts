import { createClient } from '@supabase/supabase-js'

export type SmtpScope = 'global' | 'account' | 'dept'

export type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure?: boolean
  appUrl?: string
  scope?: SmtpScope
  scopeId?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsoszdwlkqxthwstgyhv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qCNtjue4Y28vgAz4X4CqaA_DNURJiNB'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getSmtpKey(scope: SmtpScope = 'global', id?: string): string {
  if (scope === 'account' && id) return `smtp_account_${id.toLowerCase().trim()}`
  if (scope === 'dept' && id) return `smtp_dept_${id.toUpperCase().trim()}`
  return 'smtp'
}

/**
 * Mengambil konfigurasi SMTP aktif.
 * Mendukung pencarian hierarkis:
 * 1. Prioritas 1: SMTP khusus Akun Requester/Admin (key = `smtp_account_${username}`).
 * 2. Prioritas 2: SMTP khusus Departemen (key = `smtp_dept_${dept}`).
 * 3. Prioritas 3: SMTP global sistem (key = 'smtp').
 * 4. Prioritas 4: Fallback dari environment variable (.env / .env.local).
 *
 * Jika parameter `exactScope` dan `exactId` diisi, fungsi hanya akan mengambil konfigurasi spesifik tersebut (tanpa fallback).
 */
export async function getActiveSmtpConfig(options?: {
  username?: string
  dept?: string
  exactScope?: SmtpScope
  exactId?: string
}): Promise<SmtpConfig | null> {
  const { username, dept, exactScope, exactId } = options || {}

  // 1. Jika meminta exact scope spesifik (misalnya saat membuka form edit SMTP per akun / per dept)
  if (exactScope && exactScope !== 'global') {
    const key = getSmtpKey(exactScope, exactId)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
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
          scope: exactScope,
          scopeId: exactId,
        }
      }
    } catch (err) {
      console.warn(`[smtp-config] Gagal membaca exact smtp key ${key}:`, err)
    }
    return null
  }

  // 2. Pencarian Hierarkis:
  // Cek 1: Apakah akun requester memiliki SMTP sendiri?
  if (username) {
    const accountKey = getSmtpKey('account', username)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', accountKey)
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
          scope: 'account',
          scopeId: username,
        }
      }
    } catch (err) {
      console.warn(`[smtp-config] Gagal membaca smtp akun ${username}:`, err)
    }
  }

  // Cek 2: Apakah departemen requester memiliki SMTP departemen?
  if (dept) {
    const deptKey = getSmtpKey('dept', dept)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', deptKey)
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
          scope: 'dept',
          scopeId: dept,
        }
      }
    } catch (err) {
      console.warn(`[smtp-config] Gagal membaca smtp departemen ${dept}:`, err)
    }
  }

  // Cek 3: Fallback ke SMTP global sistem (Pool GA)
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
        scope: 'global',
      }
    }
  } catch (err) {
    console.warn('[smtp-config] Gagal membaca smtp global:', err)
  }

  // Cek 4: Fallback ke process.env
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
      scope: 'global',
    }
  }

  return null
}

/**
 * Menyimpan konfigurasi SMTP (bisa global, per akun, atau per departemen) ke tabel Supabase `app_settings`.
 */
export async function saveSmtpConfig(
  config: SmtpConfig,
  scope: SmtpScope = 'global',
  scopeId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const key = getSmtpKey(scope, scopeId)
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value: {
        host: config.host.trim(),
        port: Number(config.port) || 587,
        user: config.user.trim(),
        pass: config.pass,
        from: (config.from || config.user).trim(),
        secure: Number(config.port) === 465 || !!config.secure,
        appUrl: (config.appUrl || '').trim(),
        scope,
        scopeId: scopeId ? String(scopeId).trim() : null,
      },
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error(`[smtp-config] Gagal menyimpan ke Supabase (${key}):`, error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[smtp-config] Exception simpan ke Supabase:', err)
    return { ok: false, error: err?.message || 'Gagal menyimpan konfigurasi ke Supabase' }
  }
}

/**
 * Menghapus konfigurasi SMTP per akun atau per departemen agar kembali menggunakan default global.
 */
export async function deleteSmtpConfig(
  scope: SmtpScope,
  scopeId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const key = getSmtpKey(scope, scopeId)
    const { error } = await supabase.from('app_settings').delete().eq('key', key)
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal menghapus konfigurasi' }
  }
}
