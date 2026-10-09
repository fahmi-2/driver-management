'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Lock, LogIn, MailCheck, ShieldCheck, XCircle } from 'lucide-react'
import { StoreProvider, STATUS_LABEL, fmtDate, useStore } from '@/lib/store'
import { YazakiBadge } from '@/components/yazaki-logo'
import { getSession, type Account } from '@/lib/accounts'

function Approve() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { ready, db, spvDecision, poolSpvDecision } = useStore()
  const [note, setNote] = useState('')
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const s = getSession()
    setCurrentUser(s)
    setAuthChecked(true)
  }, [])

  const trip = db.trips.find((t) => t.id === id)

  // Otentikasi: Tautan email tidak lagi menyetujui secara instan tanpa login,
  // melainkan mengarahkan atasan untuk login akun ber-role Approver
  const isApproverLoggedIn = currentUser && (currentUser.role === 'approver' || currentUser.role === 'admin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9eeeb] p-4 text-[#10251c]">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-[0_20px_60px_rgba(19,45,33,0.12)]">
        <div className="mb-5 flex items-center justify-between border-b border-[#edf1ee] pb-4">
          <div className="flex items-center gap-3">
            <YazakiBadge className="h-10 px-2.5" />
            <div>
              <p className="font-bold text-[15px]">JAI-FLEET Management</p>
              <p className="text-[11px] text-[#93a097]">Gas Operations · Portal E-Sign Persetujuan</p>
            </div>
          </div>
          {currentUser && (
            <span className="rounded-full bg-[#eef5f0] border border-[#b8cfc2] px-2.5 py-1 text-[10px] font-bold text-[#075b3d]">
              {currentUser.username} ({currentUser.role})
            </span>
          )}
        </div>

        {!ready || !authChecked ? null : !trip ? (
          <p className="text-sm text-[#b83a31]">Link tidak valid atau pengajuan tidak ditemukan.</p>
        ) : !isApproverLoggedIn ? (
          /* Tampilan Wajib Login jika belum login sebagai Approver */
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Lock size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#10251c]">Otorisasi E-Sign Diperlukan</h2>
              <p className="mt-1 text-xs text-[#63726a]">
                Sesuai kebijakan keamanan PT. JAI, tautan email tidak lagi menyetujui secara instan.
                Silakan login menggunakan akun ber-role <strong>Approver (SPV / Manager)</strong> untuk meninjau tiket <strong>{trip.id}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-[#b8cfc2] bg-[#f7faf8] p-3 text-left text-xs space-y-1">
              <p className="font-bold text-[#075b3d]">{trip.destination}</p>
              <p className="text-[#708078]">Pemohon: {trip.requesterName} ({trip.dept})</p>
              <p className="text-[#708078]">Jadwal: {fmtDate(trip.date)} · Est. {trip.estDeparture} WIB</p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#075b3d] py-3 text-xs font-bold text-white shadow-md hover:bg-[#064d33] transition"
              >
                <LogIn size={15} />
                Login ke Akun Approver Sekarang &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Tampilan Setelah Approver Login */
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold">Persetujuan Kendaraan (E-Sign)</h1>
              <span className="flex items-center gap-1 rounded bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                <ShieldCheck size={12} /> Terverifikasi
              </span>
            </div>

            <dl className="mt-4 space-y-2 rounded-xl bg-[#f7faf8] p-4 text-xs">
              {[
                ['Approver Departemen', `${trip.spvName}`],
                ['Pemohon', `${trip.requesterName} (${trip.dept})`],
                ...(trip.requesterNik ? [['NIK Pemohon', trip.requesterNik]] : []),
                ['Kategori', trip.category],
                ...(trip.driverOnly
                  ? [['Tipe Pengiriman', 'Hanya Driver (Barang / Dokumen - Kupon Makan VOID)']]
                  : [
                      ['Tamu / Pemohon Utama', trip.guest],
                      ...(trip.passengers && trip.passengers.length > 0
                        ? [['Penumpang Tambahan', trip.passengers.map((p) => `${p.name} (${p.dept})`).join(', ')]]
                        : []),
                    ]),
                ['Rute / Tujuan', trip.destination],
                ...(trip.distance_km ? [['Jarak Tempuh', `${trip.distance_km} KM PP`]] : []),
                ['Keperluan', trip.purpose],
                ['Tanggal', fmtDate(trip.date)],
                ['Est. Berangkat', `${trip.estDeparture} WIB`],
                ...(trip.plate ? [['Armada Dipetakan', `${trip.plate}`]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[#93a097]">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            {trip.status === 'WAITING_SPV' ? (
              <>
                <label className="mt-4 block text-xs font-semibold text-[#66766d]">
                  Catatan Approver SPV Departemen (opsional)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-1.5 w-full rounded-lg border border-[#dce7df] p-3 text-xs font-normal outline-none focus:border-[#0b6b48]"
                    placeholder="Contoh: Disetujui untuk dinas MM2100..."
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    id="spv-reject"
                    onClick={() => spvDecision(trip.id, false, note)}
                    className="flex items-center justify-center gap-2 rounded-full border border-[#f0b9b4] py-3 text-xs font-bold text-[#b83a31] hover:bg-[#fde5e3]"
                  >
                    <XCircle size={15} /> Tolak
                  </button>
                  <button
                    id="spv-approve"
                    onClick={() => {
                      spvDecision(trip.id, true, note)
                      router.push('/')
                    }}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#075b3d] py-3 text-xs font-bold text-white hover:bg-[#0a6b49]"
                  >
                    <CheckCircle2 size={15} /> Setujui (E-Sign Tahap 1)
                  </button>
                </div>
              </>
            ) : trip.status === 'WAITING_POOL_SPV' ? (
              <>
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-bold">Menunggu Persetujuan Tahap 2: SPV Kendaraan (Pool GA)</p>
                  <p className="mt-0.5 text-[11px]">
                    Armada telah dipetakan oleh Admin. Menunggu ACC final sebelum tugas diterbitkan ke Driver.
                  </p>
                </div>
                <label className="mt-3 block text-xs font-semibold text-[#66766d]">
                  Catatan SPV Kendaraan (opsional)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-1.5 w-full rounded-lg border border-[#dce7df] p-3 text-xs font-normal outline-none focus:border-[#0b6b48]"
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => poolSpvDecision(trip.id, false, note, currentUser.name)}
                    className="flex items-center justify-center gap-2 rounded-full border border-[#f0b9b4] py-3 text-xs font-bold text-[#b83a31] hover:bg-[#fde5e3]"
                  >
                    <XCircle size={15} /> Tolak
                  </button>
                  <button
                    onClick={() => {
                      poolSpvDecision(trip.id, true, note, currentUser.name)
                      router.push('/')
                    }}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#075b3d] py-3 text-xs font-bold text-white hover:bg-[#0a6b49]"
                  >
                    <CheckCircle2 size={15} /> ACC Final SPV Kendaraan
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#dff5e9] p-4 text-xs font-semibold text-[#168052]">
                  <MailCheck size={16} /> Keputusan tercatat: {STATUS_LABEL[trip.status]}. Terima kasih.
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full rounded-xl border border-[#b8cfc2] py-2.5 text-xs font-bold text-[#075b3d] hover:bg-[#f0fdf4]"
                >
                  Buka Dasbor Aplikasi &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default function ApprovePage() {
  return <StoreProvider><Approve /></StoreProvider>
}
