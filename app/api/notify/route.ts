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
    const { tripId, isEdit, actionType, rescheduleChanges } = await req.json()
    if (!tripId) return NextResponse.json({ ok: false, error: 'tripId wajib diisi' }, { status: 400 })

    // 1. Ambil data trip dari DB
    const { data: trip, error } = await supabase.from('trips').select('*, trip_passengers(*)').eq('id', tripId).single()
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

    // Inisialisasi transporter SMTP
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure ?? (smtpConfig.port === 465),
      connectionTimeout: 15000,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })

    const origin = smtpConfig.appUrl || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const link = `${origin}/approve/${trip.id}`

    // -------------------------------------------------------------
    // KASUS KHUSUS: POST-APPROVAL RESCHEDULE [UPDATE JADWAL]
    // -------------------------------------------------------------
    if (actionType === 'reschedule') {
      const allAccounts: any[] = (await supabase.from('accounts').select('*')).data || []
      const allDrivers: any[] = (await supabase.from('drivers').select('*')).data || []

      // 1. Requester email
      const reqAcc = allAccounts.find((a: any) => a.username === trip.requester_username)
      const requesterEmail = reqAcc?.email

      // 2. Driver email / phone
      const assignedDriver = allDrivers.find((d: any) => d.id === trip.driver_id)
      const driverAcc = allAccounts.find((a: any) => a.driver_id === trip.driver_id || a.name?.toLowerCase() === assignedDriver?.name?.toLowerCase())
      const driverEmail = driverAcc?.email

      // 3. Approver Tahap 1 (SPV/Manager Dept)
      const approver1Email = trip.approver_email || trip.spv_email

      // 4. Approver Tahap 2 (SPV Kendaraan - Pool GA)
      const poolSpvEmails = await emailsByRole('approver_pool')

      const primaryRecipients = [requesterEmail, driverEmail].filter(Boolean) as string[]
      const ccRecipients = [approver1Email, ...poolSpvEmails].filter(Boolean) as string[]
      const allRecipients = Array.from(new Set([...primaryRecipients, ...ccRecipients]))

      if (allRecipients.length === 0) {
        console.warn(`[notify] Tidak ada email penerima untuk reschedule trip ${tripId}`)
        return NextResponse.json({ ok: false, error: 'Tidak ada email penerima untuk update jadwal' }, { status: 422 })
      }

      const senderName = 'Admin Lobby / Pool GA · JAI-FLEET'
      const fromAddress = smtpConfig.from.includes('<')
        ? smtpConfig.from
        : `"${senderName}" <${smtpConfig.from || smtpConfig.user}>`

      const passengerListStr = (trip.trip_passengers || []).map((p: any) => `${esc(p.name)} (${esc(p.dept)})`).join(', ') || esc(trip.guest || '—')

      const info = await transporter.sendMail({
        from: fromAddress,
        replyTo: smtpConfig.from || smtpConfig.user,
        to: (primaryRecipients.length > 0 ? primaryRecipients : allRecipients).join(','),
        cc: primaryRecipients.length > 0 && ccRecipients.length > 0 ? ccRecipients.join(',') : undefined,
        subject: `[UPDATE JADWAL] Penyesuaian Operasional Armada - Tiket ${trip.id} (${trip.department_name})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8faf9; border-radius: 16px; border: 1px solid #dce7df;">
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">[UPDATE JADWAL]</span>
              <h2 style="color: #0369a1; margin: 8px 0 0; font-size: 19px;">Pemberitahuan Perubahan Jadwal Operasional</h2>
              <p style="color: #62736b; font-size: 12px; margin: 4px 0 0;">Sistem Pengelolaan Kendaraan Operasional PT. JAI (YAZAKI GROUP)</p>
            </div>

            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #0c4a6e;">
              <strong>Informasi Penyesuaian:</strong> Admin Lobby telah melakukan penjadwalan ulang (Reschedule) operasional untuk tiket ini.
              <br/><span style="font-size: 11px; color: #0369a1;">*Approver TIDAK PERLU menekan tombol approve lagi. Perubahan ini murni penyesuaian operasional logistik.</span>
            </div>

            <div style="background: #ffffff; padding: 18px; border-radius: 12px; border: 1px solid #e1ebe4; margin-bottom: 20px;">
              <table cellpadding="6" style="width: 100%; font-size: 13px; border-collapse: collapse; color: #21352a;">
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="width: 34%; color: #62736b;"><b>No. Tiket</b></td>
                  <td>: <span style="font-family: monospace; font-weight: bold; color: #0369a1;">${esc(trip.id)}</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="color: #62736b;"><b>Pemohon</b></td>
                  <td>: <strong>${esc(trip.requester_name)}</strong> (Dept: ${esc(trip.department_name)})</td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="color: #62736b;"><b>Jadwal Baru</b></td>
                  <td>: <strong style="color: #0284c7;">${esc(trip.date)} · Jam ${esc(String(trip.est_departure || '').slice(0, 5))} - ${trip.est_return ? esc(String(trip.est_return).slice(0, 5)) : 'Selesai'} WIB</strong></td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="color: #62736b;"><b>Armada &amp; Plat</b></td>
                  <td>: <strong>${esc(trip.plate || (trip.is_other_vehicle ? trip.other_vehicle_name : 'Belum Ditugaskan'))}</strong></td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="color: #62736b;"><b>Driver Bertugas</b></td>
                  <td>: <strong>${esc(assignedDriver?.name || 'Standby Driver')}</strong> ${assignedDriver?.phone ? `(${esc(assignedDriver.phone)})` : ''}</td>
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
                  <td style="color: #62736b;"><b>Penumpang</b></td>
                  <td>: ${passengerListStr}</td>
                </tr>
                ${trip.admin_note ? `
                <tr style="border-bottom: 1px solid #f0f4f1;">
                  <td style="color: #62736b;"><b>Catatan Admin</b></td>
                  <td>: <span style="color: #b45309; font-weight: bold;">${esc(trip.admin_note)}</span></td>
                </tr>` : ''}
              </table>
            </div>

            <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
              Email ini dikirimkan otomatis kepada Pemohon, Driver yang bertugas, serta Approver Tahap 1 &amp; 2 sebagai tembusan (CC).
            </p>
          </div>
        `,
      })

      console.log('[notify] Email [UPDATE JADWAL] terkirim -> to:', primaryRecipients, 'cc:', ccRecipients, '(msgId:', info.messageId, ')')
      return NextResponse.json({ ok: true, to: allRecipients, mode: 'reschedule' })
    }

    // -------------------------------------------------------------
    // ALUR APPROVAL BIASA / PRE-APPROVAL REVISI [EDITED]
    // -------------------------------------------------------------
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

    // Format sender display name sesuai departemen / admin
    const senderName = trip.status === 'WAITING_SPV'
      ? `${trip.requester_name} (Admin ${trip.department_name})`
      : 'Sistem Armada JAI-FLEET'

    const fromAddress = smtpConfig.from.includes('<')
      ? smtpConfig.from
      : `"${senderName}" <${smtpConfig.from || smtpConfig.user}>`

    const isEditedRevision = !!isEdit
    const subjectPrefix = isEditedRevision ? '[EDITED] [Telah Direvisi] ' : ''
    const passengerListStr = (trip.trip_passengers || []).map((p: any) => `${esc(p.name)} (${esc(p.dept)})`).join(', ') || esc(trip.guest || '—')

    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: smtpConfig.from || smtpConfig.user,
      to: recipients.join(','),
      subject: `${subjectPrefix}[Permohonan Kendaraan] ${stageLabel} - ${trip.id} (${trip.department_name})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #f8faf9; border-radius: 16px; border: 1px solid #dce7df;">
          <div style="border-bottom: 2px solid #075b3d; padding-bottom: 16px; margin-bottom: 20px;">
            ${isEditedRevision ? `
              <div style="display: inline-block; background: #eab308; color: #422006; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-bottom: 8px;">
                [EDITED] PERMOHONAN TELAH DIREVISI OLEH PEMOHON
              </div>
            ` : ''}
            <h2 style="color: #075b3d; margin: 0; font-size: 19px;">JAI-FLEET Management · Notifikasi Persetujuan</h2>
            <p style="color: #62736b; font-size: 12px; margin: 4px 0 0;">Sistem Pengelolaan Kendaraan Operasional PT. JAI (YAZAKI GROUP)</p>
          </div>

          ${isEditedRevision ? `
            <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; color: #854d0e;">
              <strong>Pemberitahuan Perubahan Data:</strong> Pemohon telah melakukan revisi (jam/tujuan/penumpang/keperluan) pada tiket ini saat status masih pending. Harap tinjau data rincian terbaru di bawah ini sebelum memproses persetujuan E-Sign.
            </div>
          ` : ''}

          <div style="background: #ffffff; padding: 18px; border-radius: 12px; border: 1px solid #e1ebe4; margin-bottom: 20px;">
            <p style="font-size: 14px; font-weight: bold; color: #10251c; margin-top: 0;">${esc(stageLabel)}</p>
            <p style="font-size: 13px; color: #475a50; margin: 0 0 12px;">Pengajuan perjalanan dinas memerlukan tindakan e-sign / persetujuan Anda:</p>
            
            <table cellpadding="6" style="width: 100%; font-size: 13px; border-collapse: collapse; color: #21352a;">
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="width: 32%; color: #62736b;"><b>No. Tiket</b></td>
                <td>: <span style="font-family: monospace; font-weight: bold; color: #075b3d;">${esc(trip.id)}</span> ${isEditedRevision ? '<span style="color: #eab308; font-weight: bold;">[REVISI]</span>' : ''}</td>
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
                <td>: <strong>${esc(trip.date)} · Jam ${esc(String(trip.est_departure || '').slice(0, 5))} ${trip.est_return ? `– ${esc(String(trip.est_return).slice(0, 5))}` : ''} WIB</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f4f1;">
                <td style="color: #62736b;"><b>Penumpang</b></td>
                <td>: ${passengerListStr}</td>
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
