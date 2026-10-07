'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Plus, Send } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { COUPON_LABEL, STATUS_LABEL, fmtDate, fmtDur, fmtTime, useStore, type Category } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, btnGhost, btnPrimary, couponTone, inputCls, tdCls, thCls, tripTone, useToast } from '../ui-bits'

const CATS: Category[] = ['Dinas', 'Non-Dinas', 'Izin Keluar Lokasi Pabrik']
const PLACES = ['Kawasan Industri MM2100, Cikarang', 'Cikarang Dry Port', 'Bandara Soekarno-Hatta', 'Tanjung Priok', 'Summarecon Bekasi', 'Kantor Pusat Jakarta', 'Karawang Barat', 'Bekasi Barat']

declare global { interface Window { google?: any; __gmapsLoading?: Promise<void> } }
function loadMaps(key: string) {
  if (window.google?.maps?.places) return Promise.resolve()
  if (!window.__gmapsLoading)
    window.__gmapsLoading = new Promise<void>((res, rej) => {
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      s.async = true
      s.onload = () => res()
      s.onerror = () => rej()
      document.head.appendChild(s)
    })
  return window.__gmapsLoading
}

/** Google Maps Places Autocomplete (aktif jika NEXT_PUBLIC_GOOGLE_MAPS_API_KEY diisi), fallback ke daftar lokasi lokal. */
function PlaceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  useEffect(() => {
    if (!key || !ref.current) return
    loadMaps(key).then(() => {
      const ac = new window.google.maps.places.Autocomplete(ref.current!, { componentRestrictions: { country: 'id' } })
      ac.addListener('place_changed', () => { const p = ac.getPlace(); onChange(p?.formatted_address || p?.name || ref.current!.value) })
    }).catch(() => {})
  }, [key, onChange])
  return (
    <>
      <input ref={ref} list={key ? undefined : 'places'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={key ? 'Cari lokasi (Google Maps)' : 'Ketik tujuan'} className={inputCls} required />
      {!key && <datalist id="places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>}
    </>
  )
}

export function RequesterForm({ user }: { user: Account }) {
  const { db, createTrip } = useStore()
  const notify = useToast()
  const [f, setF] = useState({ category: 'Dinas' as Category, guest: '', destination: '', purpose: '', estDeparture: '08:00' })
  const mine = db.trips.filter((t) => t.requesterUser === user.username).slice().reverse()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    createTrip({ ...f, requesterUser: user.username, requesterName: user.name, dept: user.dept ?? '-' })
    notify(`Terkirim. Email e-sign dikirim ke SPV ${user.dept}.`)
    setF({ category: 'Dinas', guest: '', destination: '', purpose: '', estDeparture: '08:00' })
  }

  return (
    <>
      <PageHeader title="Ajukan Kendaraan" desc="Pengajuan akan dikirim ke SPV via Magic Link email untuk e-sign." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Formulir Pengajuan">
          <form onSubmit={submit} className="grid gap-3 p-5">
            <div>
              <p className="text-xs font-semibold text-[#66766d]">Kategori</p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {CATS.map((c, i) => (
                  <button type="button" key={c} onClick={() => setF({ ...f, category: c })} className={`rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition ${f.category === c ? 'border-[#075b3d] bg-[#dff4e8] text-[#075b3d]' : 'border-[#dce7df] text-[#708078] hover:bg-[#f5f8f6]'}`}>{i + 1}. {c}</button>
                ))}
              </div>
            </div>
            <label className="text-xs font-semibold text-[#66766d]">Nama Tamu / User<input value={f.guest} onChange={(e) => setF({ ...f, guest: e.target.value })} className={inputCls} required /></label>
            <label className="text-xs font-semibold text-[#66766d]">Tujuan<PlaceInput value={f.destination} onChange={(v) => setF((p) => ({ ...p, destination: v }))} /></label>
            <label className="text-xs font-semibold text-[#66766d]">Keperluan<input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} className={inputCls} required /></label>
            <label className="text-xs font-semibold text-[#66766d]">Estimasi Jam Keberangkatan<input type="time" value={f.estDeparture} onChange={(e) => setF({ ...f, estDeparture: e.target.value })} className={inputCls} required /></label>
            <button id="submit-request" className={`${btnPrimary} mt-2`}><Plus size={15} />Kirim Pengajuan</button>
          </form>
        </Card>
        <Card title="Riwayat Pengajuan Saya" subtitle={`Departemen ${user.dept}`}>
          {mine.length === 0 ? <Empty text="Belum ada pengajuan." /> : (
            <ul className="divide-y divide-[#edf1ee]">
              {mine.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs">
                  <div>
                    <p className="font-bold">{t.destination}</p>
                    <p className="mt-0.5 text-[11px] text-[#93a097]">{t.id} · {t.category} · {fmtDate(t.date)} {t.estDeparture} · {t.guest}</p>
                    {t.driverId && <p className="mt-0.5 text-[11px] text-[#708078]">{db.drivers.find((d) => d.id === t.driverId)?.name} · {t.plate}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill label={STATUS_LABEL[t.status]} tone={tripTone(t.status)} />
                    {t.status === 'WAITING_SPV' && <a href={`/approve/${t.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#b8cfc2] px-2.5 py-1 text-[10px] font-bold text-[#176c4b] hover:bg-[#eef5f0]"><Mail size={11} />Simulasi Email SPV</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

export function RequesterCoupons({ user }: { user: Account }) {
  const { db, claimCoupon } = useStore()
  const notify = useToast()
  const rows = db.trips.filter((t) => t.dept === user.dept && t.status === 'DONE' && t.coupon !== 'NONE')
  const claimable = rows.filter((t) => t.coupon === 'CLAIMABLE')
  return (
    <>
      <PageHeader title="Panel Kupon" desc="Kupon makan siang driver: CLAIMABLE jika Time Back ≥ 12:00 WIB, VOID jika sebelum 12:00." />
      <Card title="Perjalanan Departemen" subtitle={`${claimable.length} kupon siap diajukan`}>
        {rows.length === 0 ? <Empty text="Belum ada perjalanan selesai." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f7faf8]"><tr>{['Tgl', 'Tujuan', 'Driver', 'Time Go', 'Time Back', 'Durasi', 'Kupon', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id} className="border-t border-[#edf1ee]">
                <td className={tdCls}>{fmtDate(t.date)}</td><td className={tdCls}>{t.destination}</td>
                <td className={tdCls}>{db.drivers.find((d) => d.id === t.driverId)?.name}</td>
                <td className={tdCls}>{fmtTime(t.timeGo)}</td><td className={`${tdCls} font-bold`}>{fmtTime(t.timeBack)}</td><td className={tdCls}>{fmtDur(t.durationMin)}</td>
                <td className={tdCls}><Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} /></td>
                <td className={tdCls}>{t.coupon === 'CLAIMABLE' && <button onClick={() => { claimCoupon(t.id); notify('Klaim dikirim ke Admin Kupon') }} className={`${btnGhost} !py-1.5`}><Send size={12} />Ajukan Klaim</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}
