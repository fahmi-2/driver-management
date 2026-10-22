import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getActiveSmtpConfig, saveSmtpConfig, deleteSmtpConfig, type SmtpScope } from '@/lib/smtp-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const scope = (searchParams.get('scope') as SmtpScope) || 'global'
    const id = searchParams.get('id') || undefined
    const exact = searchParams.get('exact') === 'true'

    const config = await getActiveSmtpConfig(
      exact
        ? { exactScope: scope, exactId: id }
        : {
            username: scope === 'account' ? id : searchParams.get('username') || undefined,
            dept: scope === 'dept' ? id : searchParams.get('dept') || undefined,
          }
    )

    if (!config) {
      return NextResponse.json({
        ok: true,
        isConfigured: false,
        scope,
        scopeId: id,
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          user: '',
          pass: '',
          from: '',
          secure: false,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
          hasPassword: false,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      isConfigured: true,
      scope: config.scope || scope,
      scopeId: config.scopeId || id,
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        pass: config.pass ? '••••••••••••••••' : '',
        from: config.from,
        secure: config.secure,
        appUrl: config.appUrl || '',
        hasPassword: !!config.pass,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal memuat pengaturan SMTP' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      action = 'save',
      scope = 'global',
      scopeId,
      host,
      port,
      user,
      pass,
      from,
      secure,
      appUrl,
      testRecipient,
    } = body

    // 0. Aksi Uji Koneksi / Ping Handshake (tanpa kirim email)
    if (action === 'ping') {
      let resolvedPass = pass
      if (!resolvedPass || resolvedPass.includes('•••')) {
        const existing = await getActiveSmtpConfig({ exactScope: scope, exactId: scopeId }) || await getActiveSmtpConfig()
        resolvedPass = existing?.pass
      }

      if (!host || !user || !resolvedPass) {
        return NextResponse.json({
          ok: false,
          error: 'Host SMTP, Username, dan Password/App Password wajib diisi untuk menguji koneksi.',
        }, { status: 400 })
      }

      const smtpPort = Number(port) || 587
      const isSecure = smtpPort === 465 || !!secure

      const startTime = Date.now()
      const transporter = nodemailer.createTransport({
        host: String(host).trim(),
        port: smtpPort,
        secure: isSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        auth: {
          user: String(user).trim(),
          pass: resolvedPass,
        },
      })

      try {
        await transporter.verify()
        const latencyMs = Date.now() - startTime
        return NextResponse.json({
          ok: true,
          latencyMs,
          message: `Koneksi SMTP Berhasil! Terhubung ke ${host}:${smtpPort} (Respon: ${latencyMs}ms). Autentikasi akun "${user}" valid.`,
        })
      } catch (verifyErr: any) {
        let msg = verifyErr?.message || 'Gagal menghubungi server SMTP.'
        if (msg.includes('535') || verifyErr?.code === 'EAUTH') {
          msg = `Autentikasi Gagal (535): Username atau App Password salah. Untuk Gmail, pastikan 2FA aktif dan gunakan App Password 16-digit.`
        } else if (verifyErr?.code === 'ETIMEDOUT') {
          msg = `Koneksi Timeout: Server ${host} tidak merespons pada port ${smtpPort}. Coba periksa port (587 atau 465) atau koneksi internet.`
        } else if (verifyErr?.code === 'ECONNREFUSED') {
          msg = `Koneksi Ditolak: Host ${host} menolak koneksi pada port ${smtpPort}.`
        }
        return NextResponse.json({ ok: false, error: msg }, { status: 400 })
      }
    }

    // 1. Aksi uji coba kirim email (Test Send Email)
    if (action === 'test') {
      if (!testRecipient) {
        return NextResponse.json({ ok: false, error: 'Email tujuan uji coba wajib diisi' }, { status: 400 })
      }

      let resolvedPass = pass
      if (!resolvedPass || resolvedPass.includes('•••')) {
        const existing = await getActiveSmtpConfig({ exactScope: scope, exactId: scopeId }) || await getActiveSmtpConfig()
        resolvedPass = existing?.pass
      }

      if (!host || !user || !resolvedPass) {
        return NextResponse.json({
          ok: false,
          error: 'Host SMTP, Username, dan Password/App Password wajib diisi untuk melakukan tes',
        }, { status: 400 })
      }

      const smtpPort = Number(port) || 587
      const isSecure = smtpPort === 465 || !!secure

      const transporter = nodemailer.createTransport({
        host: String(host).trim(),
        port: smtpPort,
        secure: isSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        auth: {
          user: String(user).trim(),
          pass: resolvedPass,
        },
      })

      // Verifikasi koneksi SMTP dulu
      await transporter.verify()

      const targetLabel = scope === 'account'
        ? `Akun Requester (${scopeId})`
        : scope === 'dept'
        ? `Departemen (${scopeId})`
        : 'Global (Pool GA)'

      // Kirim email uji coba
      const testInfo = await transporter.sendMail({
        from: from ? String(from).trim() : String(user).trim(),
        to: String(testRecipient).trim(),
        subject: `[Test SMTP ${targetLabel}] Uji Coba Konfigurasi Email - JAI-FLEET`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:540px;padding:24px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
            <h2 style="color:#075b3d;margin-top:0">Koneksi SMTP Berhasil!</h2>
            <p style="color:#334155;font-size:14px;line-height:1.5">
              Email ini dikirimkan untuk memverifikasi pengaturan SMTP <b>${targetLabel}</b> pada Sistem JAI-FLEET Management PT. JAI.
            </p>
            <div style="background:#ffffff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:20px 0;font-size:13px">
              <table cellpadding="4" style="color:#475569">
                <tr><td><b>Lingkup Pengirim</b></td><td>: ${targetLabel}</td></tr>
                <tr><td><b>SMTP Host</b></td><td>: ${host}</td></tr>
                <tr><td><b>Port</b></td><td>: ${smtpPort} (SSL/TLS: ${isSecure ? 'Ya' : 'STARTTLS'})</td></tr>
                <tr><td><b>Akun Pengirim</b></td><td>: ${user}</td></tr>
                <tr><td><b>Waktu Pengujian</b></td><td>: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</td></tr>
              </table>
            </div>
            <p style="color:#64748b;font-size:12px;margin-bottom:0">
              Pengajuan perjalanan dari departemen ini akan dikirimkan otomatis menggunakan akun email pengirim ini.
            </p>
          </div>
        `,
      })

      return NextResponse.json({
        ok: true,
        message: `Email uji coba berhasil dikirim ke ${testRecipient} (Message ID: ${testInfo.messageId})`,
      })
    }

    // 2. Aksi simpan konfigurasi SMTP
    if (action === 'save') {
      if (!host || !user) {
        return NextResponse.json({ ok: false, error: 'Host SMTP dan Username wajib diisi' }, { status: 400 })
      }

      let finalPass = pass
      if (!finalPass || finalPass.includes('•••')) {
        const existing = await getActiveSmtpConfig({ exactScope: scope, exactId: scopeId })
        finalPass = existing?.pass
      }

      if (!finalPass) {
        return NextResponse.json({ ok: false, error: 'Password / App Password SMTP wajib diisi' }, { status: 400 })
      }

      const saveResult = await saveSmtpConfig(
        {
          host: String(host).trim(),
          port: Number(port) || 587,
          user: String(user).trim(),
          pass: finalPass,
          from: from ? String(from).trim() : String(user).trim(),
          secure: Number(port) === 465 || !!secure,
          appUrl: appUrl ? String(appUrl).trim() : undefined,
        },
        scope as SmtpScope,
        scopeId
      )

      if (!saveResult.ok) {
        let msg = saveResult.error || 'Gagal menyimpan konfigurasi ke Supabase'
        if (msg.includes('relation') || msg.includes('does not exist')) {
          msg = `Tabel "app_settings" belum ada di Supabase. Silakan jalankan query di file supabase_rls.sql pada SQL Editor Supabase.`
        }
        return NextResponse.json({ ok: false, error: msg }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        message: `Konfigurasi SMTP ${scope === 'account' ? `akun "${scopeId}"` : scope === 'dept' ? `departemen "${scopeId}"` : 'global'} berhasil disimpan.`,
      })
    }

    // 3. Aksi hapus konfigurasi SMTP kustom (revert ke default global)
    if (action === 'delete') {
      if (scope === 'global') {
        return NextResponse.json({ ok: false, error: 'Konfigurasi SMTP global tidak dapat dihapus, gunakan simpan untuk mengubahnya.' }, { status: 400 })
      }

      const delRes = await deleteSmtpConfig(scope as SmtpScope, scopeId)
      if (!delRes.ok) {
        return NextResponse.json({ ok: false, error: delRes.error || 'Gagal menghapus konfigurasi' }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        message: `Konfigurasi SMTP kustom berhasil dihapus. Sistem akan otomatis menggunakan email pengirim default global.`,
      })
    }

    return NextResponse.json({ ok: false, error: 'Aksi tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/smtp] Error:', err)
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Terjadi kesalahan pada server saat memproses konfigurasi SMTP',
    }, { status: 500 })
  }
}
