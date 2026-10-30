import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { getActiveSmtpConfig } from '@/lib/smtp-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsoszdwlkqxthwstgyhv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qCNtjue4Y28vgAz4X4CqaA_DNURJiNB'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: dapatkan daftar email Admin sistem untuk menerima notifikasi failure
async function getAdminEmails(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('accounts')
      .select('email')
      .eq('role', 'admin')

    const emails = (data || []).map((r: any) => r.email?.trim()).filter(Boolean)
    if (emails.length > 0) return Array.from(new Set(emails))
  } catch {}

  // Fallback: SMTP_USER atau email default jika akun admin belum terisi
  const fallback = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER
  return fallback ? [fallback] : []
}

// Helper: kirim email alert ke admin jika ping Supabase gagal
async function sendFailureAlertEmail(errorMessage: string) {
  try {
    const smtpConfig = await getActiveSmtpConfig()
    if (!smtpConfig) {
      console.error('[cron:keep-alive] Tidak dapat mengirim alert email: Konfigurasi SMTP belum tersedia')
      return
    }

    const adminEmails = await getAdminEmails()
    if (adminEmails.length === 0) {
      console.warn('[cron:keep-alive] Tidak ada email admin yang ditemukan untuk pengiriman alert')
      return
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure ?? (smtpConfig.port === 465),
      connectionTimeout: 15000,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })

    const nowJakarta = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(new Date())

    const subject = '[URGENT] Supabase Database Paused / Connection Failed'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; border-radius: 12px; background-color: #fffaf0;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 12px 18px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          ⚠️ PERINGATAN SISTEM: KONEKSI SUPABASE GAGAL
        </div>
        <div style="padding: 16px 0; color: #374151; font-size: 14px; line-height: 1.6;">
          <p><strong>Waktu Terdeteksi:</strong> ${nowJakarta}</p>
          <p>
            Sistem gagal melakukan ping ke database Supabase. Kemungkinan project Supabase Anda dalam status <strong>'Paused'</strong> atau sedang terjadi gangguan koneksi.
          </p>
          <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 10px 14px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #991b1b; word-break: break-word;">
            Detail Error: ${errorMessage}
          </div>
          <p>
            Harap segera login ke dashboard Supabase untuk melakukan restart project secara manual agar sistem dapat kembali beroperasi normal:
          </p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="https://app.supabase.com" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Buka Dashboard Supabase
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #6b7280; text-align: center;">
          Pesan otomatis oleh Sistem Otomasi Driver Management Cron Job
        </div>
      </div>
    `

    await transporter.sendMail({
      from: smtpConfig.from || `"Sistem Otomasi" <${smtpConfig.user}>`,
      to: adminEmails,
      subject,
      html,
    })

    console.log(`[cron:keep-alive] Alert email kegagalan berhasil dikirim ke: ${adminEmails.join(', ')}`)
  } catch (err: any) {
    console.error('[cron:keep-alive] Gagal mengirim alert email:', err?.message || err)
  }
}

// Handler utama cron job
async function handleKeepAlive(req: Request) {
  // 1. Validasi Keamanan: Authorization Header / Query Token
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const url = new URL(req.url)
    const querySecret = url.searchParams.get('secret')

    const isBearerValid = authHeader === `Bearer ${cronSecret}`
    const isHeaderValid = authHeader === cronSecret
    const isQueryValid = querySecret === cronSecret

    if (!isBearerValid && !isHeaderValid && !isQueryValid) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Invalid CRON_SECRET token' }, { status: 401 })
    }
  }

  // 2. Try-Catch Ping Database Supabase
  try {
    // Jalankan query ringan untuk mereset timer 7-hari Supabase
    // Mengambil 1 baris dari tabel accounts
    const { data, error } = await supabase
      .from('accounts')
      .select('username')
      .limit(1)

    if (error) {
      throw new Error(error.message)
    }

    const timestamp = new Date().toISOString()
    console.log(`[cron:keep-alive] Ping Supabase sukses pada ${timestamp}. Row count: ${data ? data.length : 0}`)

    // Berhasil: Return 200 OK dan TIDAK mengirimkan email (agar tidak spam inbox admin)
    return NextResponse.json({
      ok: true,
      message: 'Supabase ping successful. Database activity timer has been reset.',
      timestamp,
    })
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error('[cron:keep-alive] Ping Supabase GAGAL:', errorMsg)

    // Jika gagal / timeout: Kirimkan email alert darurat ke Admin
    await sendFailureAlertEmail(errorMsg)

    return NextResponse.json(
      {
        ok: false,
        error: 'Database ping failed. Alert notification email has been dispatched to administrators.',
        detail: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Mendukung GET (sesuai spesifikasi Vercel Cron) dan POST (untuk manual trigger/curl)
export async function GET(req: Request) {
  return handleKeepAlive(req)
}

export async function POST(req: Request) {
  return handleKeepAlive(req)
}

