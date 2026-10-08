'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, MailCheck, XCircle } from 'lucide-react'
import { StoreProvider, STATUS_LABEL, fmtDate, useStore } from '@/lib/store'
import { YazakiBadge } from '@/components/yazaki-logo'

function Approve() {
  const { id } = useParams<{ id: string }>()
  const { ready, db, spvDecision } = useStore()
  const [note, setNote] = useState('')
  const trip = db.trips.find((t) => t.id === id)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9eeeb] p-4 text-[#10251c]">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_20px_60px_rgba(19,45,33,0.12)]">
        <div className="mb-5 flex items-center gap-3">
          <YazakiBadge className="h-10 px-2.5" />
          <div>
            <p className="font-bold text-[15px]">JAI-FLEET Management</p>
            <p className="text-[11px] text-[#93a097]">Gas Operations -Yazaki · E-Sign SPV</p>
          </div>
        </div>
        {!ready ? null : !trip ? (
          <p className="text-sm text-[#b83a31]">Link tidak valid atau pengajuan tidak ditemukan.</p>
        ) : (
          <>
            <h1 className="text-xl font-bold">Persetujuan Kendaraan</h1>
            <dl className="mt-4 space-y-2 rounded-xl bg-[#f7faf8] p-4 text-xs">
              {[['Untuk', `${trip.spvName}`], ['Pemohon', `${trip.requesterName} (${trip.dept})`], ['Kategori', trip.category], ['Tamu/User', trip.guest], ['Tujuan', trip.destination], ['Keperluan', trip.purpose], ['Tanggal', fmtDate(trip.date)], ['Est. berangkat', `${trip.estDeparture} WIB`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-[#93a097]">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
            {trip.status === 'WAITING_SPV' ? (
              <>
                <label className="mt-4 block text-xs font-semibold text-[#66766d]">Catatan (opsional)
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-[#dce7df] p-3 text-xs font-normal outline-none focus:border-[#0b6b48]" />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button id="spv-reject" onClick={() => spvDecision(trip.id, false, note)} className="flex items-center justify-center gap-2 rounded-full border border-[#f0b9b4] py-3 text-xs font-bold text-[#b83a31] hover:bg-[#fde5e3]"><XCircle size={15} />Tolak</button>
                  <button id="spv-approve" onClick={() => spvDecision(trip.id, true, note)} className="flex items-center justify-center gap-2 rounded-full bg-[#075b3d] py-3 text-xs font-bold text-white hover:bg-[#0a6b49]"><CheckCircle2 size={15} />Setujui (E-Sign)</button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#dff5e9] p-4 text-xs font-semibold text-[#168052]">
                <MailCheck size={16} />Keputusan tercatat: {STATUS_LABEL[trip.status]}. Terima kasih.
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
