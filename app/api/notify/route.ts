import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

import { getActiveSmtpConfig } from '@/lib/smtp-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsoszdwlkqxthwstgyhv.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qCNtjue4Y28vgAz4X4CqaA_DNURJiNB'
)

const esc = (s: unknown) =>
  String(s ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

async function emailsByRole(role: string): Promise<string[]> {
  const { data, error } = await supabase.from('accounts').select('email').eq('role', role)
  if (error) throw new Error(`Gagal ambil akun role ${role}: ${error.message}`)
  return (data || []).map((r: any) => r.email).filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const { tripId } = await req.json()
    if (!tripId) return NextResponse.json({ ok: false, error: 'tripId wajib diisi' }, { status: 400 })

    const smtpConfig = await getActiveSmtpConfig()
    if (!smtpConfig) {
      console.error('[notify] Konfigurasi SMTP belum diatur di menu Pengaturan SMTP web atau di .env.local')
      return NextResponse.json({
        ok: false,
        error: 'Konfigurasi SMTP belum diatur. Silakan atur di menu Pengaturan SMTP (Admin Pool GA).',
      }, { status: 500 })
    }

    // Ambil data trip dari DB (sumber tepercaya, bukan dari body request)
    const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
    if (error || !trip) {
      return NextResponse.json({ ok: false, error: `Trip tidak ditemukan: ${error?.message}` }, { status: 404 })
    }

    let recipients: string[] = []
    let stageLabel = ''
    switch (trip.status) {
      case 'WAITING_SPV':
        recipients = [trip.approver_email || trip.spv_email].filter(Boolean)
        stageLabel = 'Persetujuan SPV Departemen (Tahap 1)'
        break
      case 'WAITING_ASSIGN':
        recipients = await emailsByRole('admin')
        stageLabel = 'Penjadwalan Armada & Driver oleh Admin'
        break
      case 'WAITING_POOL_SPV':
        recipients = await emailsByRole('approver_pool')
        stageLabel = 'Persetujuan SPV Kendaraan (Tahap 2)'
        break
      default:
        return NextResponse.json({ ok: true, skipped: `Status ${trip.status} tidak memerlukan email` })
    }

    recipients = Array.from(new Set(recipients))
    if (recipients.length === 0) {
      console.warn(`[notify] Tidak ada email penerima untuk trip ${tripId} (${trip.status})`)
      return NextResponse.json({ ok: false, error: 'Tidak ada alamat email penerima (cek kolom email di tabel accounts)' }, { status: 422 })
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure ?? (smtpConfig.port === 465),
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })

    const origin = smtpConfig.appUrl || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const link = `${origin}/approve/${trip.id}`

    const info = await transporter.sendMail({
      from: smtpConfig.from || smtpConfig.user,
      to: recipients.join(','),
      subject: `[Approval] ${stageLabel} - ${trip.id}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px">
          <h2>Menunggu tindakan Anda</h2>
          <p><b>${esc(stageLabel)}</b></p>
          <table cellpadding="4">
            <tr><td>ID</td><td>: ${esc(trip.id)}</td></tr>
            <tr><td>Pemohon</td><td>: ${esc(trip.requester_name)} (${esc(trip.department_name)})</td></tr>
            <tr><td>Tujuan</td><td>: ${esc(trip.destination)}</td></tr>
            <tr><td>Keperluan</td><td>: ${esc(trip.purpose)}</td></tr>
            <tr><td>Tanggal</td><td>: ${esc(trip.date)} ${esc(String(trip.est_departure || '').slice(0, 5))}</td></tr>
          </table>
          <p><a href="${link}" style="background:#a3e635;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Buka &amp; Proses Pengajuan</a></p>
        </div>`,
    })

    console.log('[notify] Email terkirim:', info.messageId, '->', recipients)
    return NextResponse.json({ ok: true, to: recipients })
  } catch (err: any) {
    console.error('[notify] Gagal kirim email:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal mengirim email' }, { status: 500 })
  }
}
