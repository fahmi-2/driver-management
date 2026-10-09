'use client'

import React, { useState } from 'react'
import { BadgeCheck, FileText, ArrowRight, CheckCircle2, Search, Eye } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { COUPON_LABEL, fmtDate, fmtTime, useStore, Trip } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, btnPrimary, couponTone, tdCls, thCls, useToast } from '../ui-bits'

export function CouponPending({ user }: { user: Account }) {
  const { db, setCouponProgress, payCoupon } = useStore()
  const notify = useToast()

  // State untuk Pop-up Input Nomor PR Manual
  const [prModalTrip, setPrModalTrip] = useState<Trip | null>(null)
  const [manualPrNumber, setManualPrNumber] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Trip | null>(null)

  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'

  // Antrean klaim yang sedang diproses oleh Finance (Belum Dibuat PR atau Sedang Dibuat PR)
  const rows = db.trips.filter((t) => t.coupon === 'PR_PENDING' || t.coupon === 'PR_PROGRESS')

  const openPrModal = (trip: Trip) => {
    // Generate suggested PR number: PR-YYYY-XXXX
    const defaultPr = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    setManualPrNumber(defaultPr)
    setPrModalTrip(trip)
  }

  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prModalTrip) return
    if (!manualPrNumber.trim()) {
      notify('Nomor PR wajib diisi!')
      return
    }

    payCoupon(prModalTrip.id, user.name, manualPrNumber.trim())
    notify(`Pencairan ACC Payout berhasil! Status: Created dengan No. PR ${manualPrNumber.trim()}`)
    setPrModalTrip(null)
    setManualPrNumber('')
  }

  return (
    <>
      <PageHeader 
        title="Antrean Klaim & Pembuatan Purchase Request (PR)" 
        desc="Panel Finance / Admin Kupon: Memproses alur pencairan uang makan siang driver & nomor PR." 
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-semibold uppercase">Belum Dibuat PR</span>
            <Pill label={`${db.trips.filter((t) => t.coupon === 'PR_PENDING').length} Klaim`} tone="amber" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">
            {db.trips.filter((t) => t.coupon === 'PR_PENDING').length} <span className="text-xs font-normal text-[#8fa99b]">Menunggu PR</span>
          </p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Ubah ke &quot;Sedang Dibuat PR&quot; saat memproses ke sistem ERP/Finance</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300 font-semibold uppercase">Sedang Dibuat PR</span>
            <Pill label={`${db.trips.filter((t) => t.coupon === 'PR_PROGRESS').length} Klaim`} tone="purple" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">
            {db.trips.filter((t) => t.coupon === 'PR_PROGRESS').length} <span className="text-xs font-normal text-[#8fa99b]">Sedang Proses</span>
          </p>
          <p className="text-[11px] text-[#8fa99b] mt-1">Klik &quot;ACC Payout&quot; untuk input Nomor PR final secara manual</p>
        </div>
      </div>

      <Card title="Antrean Klaim Masuk" subtitle={`${rows.length} klaim dalam antrean proses`}>
        {rows.length === 0 ? (
          <Empty text="Tidak ada klaim pending yang membutuhkan pembuatan PR." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f7faf8]">
                <tr>
                  {['Tgl Trip', 'Nama Driver', 'Pemohon / NIK', 'Tujuan', 'Jam Kembali', 'Status Alur PR', 'Aksi Finance'].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-[#edf1ee]">
                    <td className={tdCls}>{fmtDate(t.date)}</td>
                    <td className={`${tdCls} font-semibold text-white`}>{dn(t.driverId)}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-white">{t.requesterName}</div>
                      <div className="text-[10px] text-[#8fa99b] font-mono">NIK: {t.requesterNik || '—'} · {t.dept}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-white">{t.destination}</div>
                      <div className="text-[10px] text-[#8fa99b]">Berangkat: {fmtTime(t.timeGo)} WIB</div>
                    </td>
                    <td className={`${tdCls} font-bold text-[#bef264]`}>{fmtTime(t.timeBack)} WIB</td>
                    <td className={tdCls}>
                      <Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} />
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        {/* Status awal: Belum Dibuat PR -> Tombol: Ubah ke Sedang Dibuat PR */}
                        {t.coupon === 'PR_PENDING' && (
                          <button
                            onClick={() => {
                              setCouponProgress(t.id)
                              notify('Status diubah: Sedang Dibuat PR')
                            }}
                            className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-2.5 py-1.5 text-xs font-semibold transition"
                          >
                            <ArrowRight size={13} />
                            Sedang Dibuat PR
                          </button>
                        )}

                        {/* Tombol ACC Payout (Muncul pop-up input PR manual) */}
                        <button
                          onClick={() => openPrModal(t)}
                          className={`${btnPrimary} !py-1.5 text-xs`}
                        >
                          <BadgeCheck size={13} />
                          ACC Payout
                        </button>

                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white p-1.5 transition"
                          title="Lihat Rincian Kupon"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pop-up Modal Input Nomor PR Manual */}
      {prModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  KONFIRMASI PENCIRAN (ACC PAYOUT)
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Input Purchase Request (PR)</h3>
                <p className="text-xs text-[#8fa99b]">Masukkan Nomor PR untuk mengubah status menjadi &quot;Created&quot;.</p>
              </div>
              <button
                type="button"
                onClick={() => setPrModalTrip(null)}
                className="rounded-full bg-white/10 p-1 text-[#8fa99b] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Ringkasan Klaim */}
            <div className="space-y-2 rounded-xl bg-white/[0.03] border border-white/10 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Driver:</span>
                <span className="font-bold text-white">{dn(prModalTrip.driverId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Pemohon (NIK):</span>
                <span className="font-bold text-white">{prModalTrip.requesterName} ({prModalTrip.requesterNik || '—'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Tujuan:</span>
                <span className="font-bold text-[#bef264]">{prModalTrip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa99b]">Jam Berangkat / Kembali:</span>
                <span className="text-white font-medium">{fmtTime(prModalTrip.timeGo)} - {fmtTime(prModalTrip.timeBack)} WIB</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1.5">
                  Nomor Purchase Request (PR) <span className="text-red-400">*Wajib Diisi</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-[#8fa99b]" />
                  <input
                    type="text"
                    required
                    value={manualPrNumber}
                    onChange={(e) => setManualPrNumber(e.target.value.toUpperCase())}
                    placeholder="Contoh: PR-2026-0891"
                    className="w-full rounded-xl border border-white/20 bg-black/60 pl-9 pr-3 py-2 text-sm font-mono font-bold text-white placeholder-[#8fa99b]/50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#8fa99b] mt-1">
                  Nomor PR ini akan dilampirkan secara permanen pada arsip riwayat pencairan kupon.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPrModalTrip(null)}
                  className="w-1/2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg transition"
                >
                  <CheckCircle2 size={14} />
                  Simpan & Created
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Tiket Kupon (Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="rounded-md bg-[#a3e635] px-2 py-0.5 text-[10px] font-extrabold text-[#052e16]">
                  DETAIL KUPON MAKAN
                </span>
                <h3 className="text-base font-bold text-white mt-1">Rincian Perjalanan & Kupon</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-full bg-white/10 p-1 text-[#8fa99b] hover:text-white">✕</button>
            </div>

            <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
              <div className="flex justify-between"><span className="text-[#8fa99b]">Nama:</span><span className="font-bold text-white">{selectedTicket.requesterName}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">NIK:</span><span className="font-mono font-bold text-white">{selectedTicket.requesterNik || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Departemen:</span><span className="text-white font-medium">{selectedTicket.dept}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Tujuan:</span><span className="font-bold text-[#bef264]">{selectedTicket.destination}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Jam Berangkat:</span><span className="text-white font-semibold">{fmtTime(selectedTicket.timeGo)} WIB</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Jam Kembali:</span><span className="font-bold text-[#bef264]">{fmtTime(selectedTicket.timeBack)} WIB</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Driver:</span><span className="text-white font-medium">{dn(selectedTicket.driverId)} ({selectedTicket.plate ?? '—'})</span></div>
              <div className="flex justify-between pt-1"><span className="text-[#8fa99b]">Status:</span><Pill label={COUPON_LABEL[selectedTicket.coupon]} tone={couponTone(selectedTicket.coupon)} /></div>
            </div>

            <button onClick={() => setSelectedTicket(null)} className="w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/15">
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function CouponHistory() {
  const { db } = useStore()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const rows = db.trips.filter((t) => t.coupon === 'PAID').slice().reverse()
  const [selectedTicket, setSelectedTicket] = useState<Trip | null>(null)

  return (
    <>
      <PageHeader 
        title="Riwayat Pencairan Kupon (Created PR)" 
        desc="Arsip audit pencairan kupon makan siang yang telah diterbitkan Purchase Request (PR)." 
      />
      <Card title="Arsip PR Terbit (Created)" subtitle={`${rows.length} transaksi kupon cair`}>
        {rows.length === 0 ? (
          <Empty text="Belum ada riwayat kupon dengan status Created." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f7faf8]">
                <tr>
                  {['Tgl Trip', 'Nomor PR', 'Nama Driver', 'Pemohon / NIK', 'Tujuan', 'Jam Berangkat', 'Jam Kembali', 'Dicairkan Oleh', 'Status'].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-[#edf1ee]">
                    <td className={tdCls}>{fmtDate(t.date)}</td>
                    <td className={`${tdCls} font-mono font-bold text-sky-400`}>
                      {t.prNumber || 'PR-2026-0881'}
                    </td>
                    <td className={`${tdCls} font-semibold text-white`}>{dn(t.driverId)}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-white">{t.requesterName}</div>
                      <div className="text-[10px] text-[#8fa99b] font-mono">NIK: {t.requesterNik || '—'}</div>
                    </td>
                    <td className={tdCls}>{t.destination}</td>
                    <td className={tdCls}>{fmtTime(t.timeGo)} WIB</td>
                    <td className={`${tdCls} font-bold text-[#bef264]`}>{fmtTime(t.timeBack)} WIB</td>
                    <td className={tdCls}>
                      <div className="text-white font-medium">{t.paidBy || 'Finance'}</div>
                      <div className="text-[10px] text-[#8fa99b]">
                        {t.paidAt ? fmtDate(t.paidAt.slice(0, 10)) : '—'}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        <Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} />
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white p-1 text-[10px] transition"
                          title="Lihat Tiket"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Detail Tiket Kupon (Nama, NIK, Tujuan, Jam Berangkat, Jam Kembali) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#0a2318] to-[#04120c] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 text-[10px] font-extrabold font-mono">
                  {selectedTicket.prNumber || 'PR-2026-0881'}
                </span>
                <h3 className="text-base font-bold text-white mt-1">Detail Tiket Kupon (Created)</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-full bg-white/10 p-1 text-[#8fa99b] hover:text-white">✕</button>
            </div>

            <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
              <div className="flex justify-between"><span className="text-[#8fa99b]">Nama:</span><span className="font-bold text-white">{selectedTicket.requesterName}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">NIK:</span><span className="font-mono font-bold text-white">{selectedTicket.requesterNik || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Departemen:</span><span className="text-white font-medium">{selectedTicket.dept}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Tujuan:</span><span className="font-bold text-[#bef264]">{selectedTicket.destination}</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Jam Berangkat:</span><span className="text-white font-semibold">{fmtTime(selectedTicket.timeGo)} WIB</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Jam Kembali:</span><span className="font-bold text-[#bef264]">{fmtTime(selectedTicket.timeBack)} WIB</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Driver:</span><span className="text-white font-medium">{dn(selectedTicket.driverId)} ({selectedTicket.plate ?? '—'})</span></div>
              <div className="flex justify-between"><span className="text-[#8fa99b]">Nomor PR:</span><span className="font-bold font-mono text-sky-400">{selectedTicket.prNumber || '—'}</span></div>
              <div className="flex justify-between pt-1"><span className="text-[#8fa99b]">Status:</span><Pill label={COUPON_LABEL[selectedTicket.coupon]} tone={couponTone(selectedTicket.coupon)} /></div>
            </div>

            <button onClick={() => setSelectedTicket(null)} className="w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/15">
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  )
}
