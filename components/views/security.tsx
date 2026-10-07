'use client'

import { LogIn, LogOut } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { fmtDur, fmtTime, useStore } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, useToast } from '../ui-bits'

export function SecurityGate({ user }: { user: Account }) {
  const { db, gateGo, gateBack } = useStore()
  const notify = useToast()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const ready = db.trips.filter((t) => t.status === 'READY')
  const out = db.trips.filter((t) => t.status === 'ON_TRIP')
  const doneToday = db.trips.filter((t) => t.status === 'DONE' && t.securityBack).slice(-5).reverse()

  return (
    <>
      <PageHeader title="Gate Clearance" desc={`Paraf digital gerbang · ${user.name}`} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Siap Berangkat" subtitle="Sudah di-assign Admin Utama">
          {ready.length === 0 ? <Empty text="Tidak ada kendaraan siap berangkat." /> : (
            <ul className="divide-y divide-[#edf1ee]">{ready.map((t) => (
              <li key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-lg font-bold tracking-tight">{t.plate}</p><p className="text-xs text-[#708078]">{dn(t.driverId)} · {t.destination}</p><p className="mt-1 text-[11px] text-[#93a097]">Est. {t.estDeparture} WIB</p></div>
                  <Pill label="Siap" tone="green" />
                </div>
                <button id={`go-${t.id}`} onClick={() => { gateGo(t.id, user.username); notify(`${t.plate} BERANGKAT ${new Date().toLocaleTimeString('id-ID')}`) }} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#075b3d] text-base font-bold text-white shadow-lg shadow-[#075b3d]/25 transition active:scale-[.98]"><LogOut size={20} />BERANGKAT</button>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card title="Sedang Di Luar" subtitle="Klik KEMBALI saat masuk gerbang">
          {out.length === 0 ? <Empty text="Tidak ada kendaraan di luar." /> : (
            <ul className="divide-y divide-[#edf1ee]">{out.map((t) => (
              <li key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-lg font-bold tracking-tight">{t.plate}</p><p className="text-xs text-[#708078]">{dn(t.driverId)} · {t.destination}</p><p className="mt-1 text-[11px] text-[#93a097]">Keluar {fmtTime(t.timeGo)} WIB</p></div>
                  <Pill label="Bertugas" tone="blue" />
                </div>
                <button id={`back-${t.id}`} onClick={() => { gateBack(t.id, user.username); notify(`${t.plate} KEMBALI tercatat`) }} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e08a00] text-base font-bold text-white shadow-lg shadow-[#e08a00]/25 transition active:scale-[.98]"><LogIn size={20} />KEMBALI</button>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
      <Card className="mt-4" title="Log Terakhir">
        {doneToday.length === 0 ? <Empty text="Belum ada log." /> : (
          <ul className="divide-y divide-[#edf1ee]">{doneToday.map((t) => <li key={t.id} className="flex justify-between px-5 py-3 text-xs"><span className="font-semibold">{t.plate} · {dn(t.driverId)}</span><span className="text-[#708078]">{fmtTime(t.timeGo)} → {fmtTime(t.timeBack)} ({fmtDur(t.durationMin)})</span></li>)}</ul>
        )}
      </Card>
    </>
  )
}
