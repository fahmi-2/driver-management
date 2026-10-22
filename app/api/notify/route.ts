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

    // 1. Ambil data trip dari DB
    const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
    if (error || !trip) {
      return NextResponse.json({ ok: false, error: `Trip tidak ditemukan: ${error?.message}` }, { status: 404 })
    }

    // 2. Resolusi konfigurasi SMTP pengirim:
    // Prioritas 1: Akun requester pengaju (misal: dewi.p)
    // Prioritas 2: Departemen pengaju (misal: PGA)
    // Prioritas 3: Global / Pool GA
    const smtpConfig = await getActiveSmtpConfig({
      username: trip.requester_username,
      dept: trip.department_name,
    })

    if (!smtpConfig) {
      console.error(`[notify] Konfigurasi SMTP belum diatur untuk requester "${trip.requester_username}" / departemen "${trip.department_name}" maupun global`)
      return NextResponse.json({
        ok: false,
        error: `Konfigurasi SMTP belum diatur untuk departemen ${trip.department_name} / akun ${trip.requester_username}. Silakan atur di menu Profil & SMTP.`,
      }, { status: 500 })
    }

    // 3. Tentukan penerima & label tahapan approval
    let recipients: string[] = []
    let stageLabel = ''
    switch (trip.status) {
      case 'WAITING_SPV':
        recipients = [trip.approver_email || trip.spv_email].filter(Boolean)
        stageLabel = 'Persetujuan SPV / Manager Departemen (Tahap 1)'
        break
      case 'WAITING_ASSIGN':
        recipients = await emailsByRole('admin')
        stageLabel = 'Penjadwalan Armada & Driver oleh Admin Pool GA'
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
      return NextResponse.json({ ok: false, error: 'Tidak ada alamat email penerima (cek kolom email approver/accounts)' }, { status: 422 })
    }

    // 4. Inisialisasi transporter SMTP
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure ?? (smtpConfig.port === 465),
      connectionTimeout: 15000,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })

    const origin = smtpConfig.appUrl || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const link = `${origin}/approve/${trip.id}`

    // Format sender display name sesuai departemen / admin
    const senderName = trip.status === 'WAITING_SPV'
      ? `${trip.requester_name} (Admin ${trip.department_name})`
      : 'Sistem Armada JAI-FLEET'

    const fromAddress = smtpConfig.from.includes('<')
      ? smtpConfig.from
      : `"${senderName}" <${smtpConfig.from || smtpConfig.user}>`

    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: smtpConfig.from || smtpConfig.user,
      to: recipients.join(','),
      subject: `[Permohonan Kendaraan] ${stageLabel} - ${trip.id} (${trip.department_name})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #f8faf9; border-radius: 16px; border: 1px solid #dce7df;">
          <div style="border-bottom: 2px solid #075b3d; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #075b3d; margin: 0; font-size: 19px;">JAI-FLEET Management · Notifikasi Persetujuan</h2>
            <p style="color: #62736b; font-size: 12px; margin: 4px 0 0;">Sistem Pengelolaan Kendaraan Operasional PT. JAI (YAZAKI GROUP)</p>
          </div>

          <div style="background: #ffffff; padding: 18px; border-radius: 12px; border: 1px solid #e1ebe4; margin-bottom: 20px;">
            <p style="font-size: 14px; font-weight: bold; color: #10251c; margin-top: 0;">${esc(stageLabel)}</p>
            <p style="font-size: 13px; color: #475a50; margin: 0 0 12px;">Pengajuan perjalanan dinas memerlukan tindakan e-sign / persetujuan Anda:</p>
            
            <table cellpadding="6" style="width: 100%; font-size: 13px; border-collapse: collapse; color: #21352a;">
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="width: 32%; color: #62736b;"><b>No. Tiket</b></td>
                <td>: <span style="font-family: monospace; font-weight: bold; color: #075b3d;">${esc(trip.id)}</span></td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="color: #62736b;"><b>Pemohon</b></td>
                <td>: <strong>${esc(trip.requester_name)}</strong> (Dept: ${esc(trip.department_name)}${trip.section_name ? ` · Section: ${esc(trip.section_name)}` : ''})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="color: #62736b;"><b>Tujuan</b></td>
                <td>: <strong>${esc(trip.destination)}</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="color: #62736b;"><b>Keperluan</b></td>
                <td>: ${esc(trip.purpose)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="color: #62736b;"><b>Jadwal</b></td>
                <td>: ${esc(trip.date)} · Jam ${esc(String(trip.est_departure || '').slice(0, 5))} WIB</td>
              </tr>
              <tr>
                <td style="color: #62736b;"><b>Pengirim Notifikasi</b></td>
                <td>: ${esc(smtpConfig.from || smtpConfig.user)} (${smtpConfig.scope === 'account' ? `Akun ${trip.requester_username}` : smtpConfig.scope === 'dept' ? `Dept ${trip.department_name}` : 'Pool GA Global'})</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0 16px;">
            <a href="${link}" style="display: inline-block; background: #075b3d; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(7,91,61,0.25);">
              Buka &amp; Proses E-Sign Persetujuan &rarr;
            </a>
          </div>

          <p style="font-size: 11px; color: #8fa096; text-align: center; margin: 0;">
            Sesuai regulasi keamanan PT. JAI, login dengan akun Approver akan diminta saat meninjau permohonan.
          </p>
        </div>`,
    })

    console.log('[notify] Email terkirim via', smtpConfig.user, '->', recipients, '(messageId:', info.messageId, ')')
    return NextResponse.json({
      ok: true,
      to: recipients,
      sender: smtpConfig.user,
      scope: smtpConfig.scope,
    })
  } catch (err: any) {
    console.error('[notify] Gagal kirim email:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal mengirim email' }, { status: 500 })
  }
}
