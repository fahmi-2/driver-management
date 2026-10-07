'use client'

import { BadgeCheck } from 'lucide-react'
import type { Account } from '@/lib/accounts'
import { COUPON_LABEL, fmtDate, fmtTime, useStore } from '@/lib/store'
import { Card, Empty, PageHeader, Pill, btnPrimary, couponTone, tdCls, thCls, useToast } from '../ui-bits'

export function CouponPending({ user }: { user: Account }) {
  const { db, payCoupon } = useStore()
  const notify = useToast()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const rows = db.trips.filter((t) => t.coupon === 'CLAIMED')
  return (
    <>
      <PageHeader title="Pending Claims" desc="Pengajuan pencairan uang makan siang dari Requester." />
      <Card title="Antrean Klaim" subtitle={`${rows.length} menunggu`}>
        {rows.length === 0 ? <Empty text="Tidak ada klaim pending." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left">
            <thead className="bg-[#f7faf8]"><tr>{['Tgl', 'Nama Sopir', 'Requester', 'Jam Kembali Aktual', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id} className="border-t border-[#edf1ee]">
                <td className={tdCls}>{fmtDate(t.date)}</td><td className={`${tdCls} font-semibold`}>{dn(t.driverId)}</td>
                <td className={tdCls}>{t.requesterName} · {t.dept}</td><td className={`${tdCls} font-bold`}>{fmtTime(t.timeBack)} WIB</td>
                <td className={tdCls}><button id={`pay-${t.id}`} onClick={() => { payCoupon(t.id, user.name); notify('Dana dicairkan') }} className={`${btnPrimary} !py-1.5`}><BadgeCheck size={13} />ACC Payout</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}

export function CouponHistory() {
  const { db } = useStore()
  const dn = (id?: string) => db.drivers.find((d) => d.id === id)?.name ?? '—'
  const rows = db.trips.filter((t) => t.coupon === 'PAID').slice().reverse()
  return (
    <>
      <PageHeader title="Riwayat Pencairan" desc="Catatan audit pencairan kupon makan siang." />
      <Card title="Dana Cair" subtitle={`${rows.length} transaksi`}>
        {rows.length === 0 ? <Empty text="Belum ada pencairan." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f7faf8]"><tr>{['Tgl Trip', 'Sopir', 'Requester', 'Jam Kembali', 'Dicairkan', 'Oleh', 'Status'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id} className="border-t border-[#edf1ee]">
                <td className={tdCls}>{fmtDate(t.date)}</td><td className={tdCls}>{dn(t.driverId)}</td><td className={tdCls}>{t.requesterName}</td>
                <td className={tdCls}>{fmtTime(t.timeBack)}</td>
                <td className={tdCls}>{t.paidAt ? `${fmtDate(t.paidAt.slice(0, 10))} ${fmtTime(t.paidAt)}` : '—'}</td>
                <td className={tdCls}>{t.paidBy}</td><td className={tdCls}><Pill label={COUPON_LABEL[t.coupon]} tone={couponTone(t.coupon)} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}
