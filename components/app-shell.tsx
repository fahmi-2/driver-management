'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusFront, CalendarDays, ChevronDown, Contact, Database, FileText, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, RotateCcw, ShieldCheck, Table2, Ticket, Truck, UsersRound, X, type LucideIcon } from 'lucide-react'
import { ROLE_LABEL, getSession, setSession, type Account, type Role } from '@/lib/accounts'
import { YazakiBadge, YazakiEmblem } from '@/components/yazaki-logo'
import { ProfileSettingsModal } from '@/components/profile-settings-modal'
import { StoreProvider, useStore } from '@/lib/store'
import { ToastProvider } from './ui-bits'
import { Dashboard } from './views/dashboard'
import { RequesterCoupons, RequesterForm } from './views/requester'
import { RequesterInbox } from './views/requester-inbox'
import { AdminDrivers, AdminLiveData, AdminWorkload } from './views/admin'
import { AdminSchedulingCenter } from './views/scheduling-center'
import { AdminVehicles } from './views/vehicles'
import { SecurityGate } from './views/security'
import { CouponHistory, CouponPending } from './views/coupon'
import { ApproverInbox } from './views/approver'
import { DriverDashboard } from './views/driver-dashboard'

type NavSubItem = { id: string; label: string; icon: LucideIcon; desc?: string }
type NavItem =
  | { id: string; label: string; icon: LucideIcon; isDropdown?: false }
  | { id: string; label: string; icon: LucideIcon; isDropdown: true; children: NavSubItem[] }

const NAV: Record<Role, NavItem[]> = {
  requester: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'request', label: 'Ajukan Kendaraan', icon: FileText },
    { id: 'inbox', label: 'Notifikasi & Riwayat', icon: Inbox },
    { id: 'coupons', label: 'Panel Kupon', icon: Ticket },
  ],
  approver: [
    { id: 'approvals', label: 'Inbox Persetujuan (E-Sign)', icon: Inbox },
    { id: 'dashboard', label: 'Dashboard Armada', icon: LayoutDashboard },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scheduling', label: 'Waiting List & Jadwal', icon: ListChecks },
    {
      id: 'kelola-data',
      label: 'Kelola Data',
      icon: Database,
      isDropdown: true,
      children: [
        { id: 'vehicles', label: 'Daftar Kendaraan', icon: Truck, desc: 'Master armada & status kendaraan' },
        { id: 'drivers', label: 'Daftar Sopir', icon: Contact, desc: 'Database personil sopir & shift' },
      ],
    },
    { id: 'live', label: 'Live Data', icon: Table2 },
    { id: 'workload', label: 'Beban Kerja', icon: UsersRound },
  ],
  security: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gate', label: 'Gate Clearance', icon: ShieldCheck },
  ],
  coupon: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pending', label: 'Pending Claims', icon: CalendarDays },
    { id: 'history', label: 'Riwayat', icon: Ticket },
  ],
  driver: [
    { id: 'dashboard', label: 'Jadwal Tugas Driver', icon: Truck },
  ],
}

function Badge({ role, id, user }: { role: Role; id: string; user?: Account }) {
  const { db } = useStore()
  if (role === 'approver' && id === 'approvals') {
    const isPoolSpv = user?.username === 'spv_pool' || user?.dept === 'HR & GA'
    const pending = db.trips.filter((t) => {
      if (isPoolSpv) return t.status === 'WAITING_POOL_SPV' || (t.status === 'WAITING_SPV' && t.dept === user?.dept)
      return t.dept === user?.dept && t.status === 'WAITING_SPV'
    }).length
    return pending ? <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black">{pending}</span> : null
  }

  const n = role === 'admin' && (id === 'scheduling' || id === 'approval') ? db.trips.filter((t) => t.status === 'WAITING_ASSIGN').length
    : role === 'security' && id === 'gate' ? db.trips.filter((t) => t.status === 'READY' || t.status === 'ON_TRIP').length
    : role === 'coupon' && id === 'pending' ? db.trips.filter((t) => t.coupon === 'PR_PENDING' || t.coupon === 'PR_PROGRESS').length
    : role === 'requester' && id === 'inbox' ? db.trips.filter((t) => t.status === 'READY').length
    : 0
  return n ? <span className="rounded-md bg-[#126d4a] px-1.5 py-0.5 text-[9px] font-bold text-white">{n}</span> : null
}

function Shell({ user, onLogout }: { user: Account; onLogout: () => void }) {
  const { resetDemo } = useStore()
  const [currentUser, setCurrentUser] = useState<Account>(user)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const nav = NAV[currentUser.role] || NAV.requester
  const [page, setPage] = useState(currentUser.role === 'approver' ? 'approvals' : 'dashboard')
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentUser(user)
    if (user.role === 'approver') setPage('approvals')
  }, [user])

  useEffect(() => {
    const handleProfileUpdated = () => {
      const fresh = getSession()
      if (fresh) setCurrentUser(fresh)
    }
    window.addEventListener('profile_updated', handleProfileUpdated)
    return () => window.removeEventListener('profile_updated', handleProfileUpdated)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let view
  if (currentUser?.role === 'driver') view = <DriverDashboard user={currentUser} />
  else if (page === 'approvals') view = <ApproverInbox user={currentUser} />
  else if (page === 'request') view = <RequesterForm user={currentUser} />
  else if (page === 'inbox') view = <RequesterInbox user={currentUser} />
  else if (page === 'coupons') view = <RequesterCoupons user={currentUser} />
  else if (page === 'scheduling' || page === 'approval') view = <AdminSchedulingCenter user={currentUser} />
  else if (page === 'vehicles') view = <AdminVehicles />
  else if (page === 'drivers') view = <AdminDrivers />
  else if (page === 'live') view = <AdminLiveData />
  else if (page === 'workload') view = <AdminWorkload />
  else if (page === 'gate') view = <SecurityGate user={currentUser} />
  else if (page === 'pending') view = <CouponPending user={currentUser} />
  else if (page === 'history') view = <CouponHistory />
  else view = <Dashboard user={currentUser} />

  return (
    <div className="relative min-h-screen text-[#e8f5ec]">
      <div className="aurora" />
      <div className="aurora-grid" />
      {/* Top Navbar */}
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0 anim-fade-in">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <YazakiBadge className="h-10 px-2.5 transition-transform hover:scale-105" />
            <div>
              <span className="text-[17px] font-extrabold tracking-tight text-white block leading-tight">JAI-FLEET Management</span>
              <p className="text-[10px] text-[#9aa7a0] hidden sm:block mt-0.5">Gas Operations</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 py-2">
            {nav.map((item) => {
              if (item.isDropdown) {
                const isChildActive = item.children.some((c) => c.id === page)
                return (
                  <div key={item.id} className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${isChildActive
                        ? 'bg-[#075b3d] text-white shadow-md shadow-[#075b3d]/20'
                        : 'text-[#64746b] hover:bg-[#eef5f0] hover:text-[#087348]'
                        }`}
                    >
                      <item.icon size={15} />
                      <span>{item.label}</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl border border-[#dce7df] bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 z-50">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9aa7a0]">
                          Sub Menu Kelola Data
                        </div>
                        <div className="space-y-1">
                          {item.children.map((child) => {
                            const isSubActive = page === child.id
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  setPage(child.id)
                                  setDropdownOpen(false)
                                }}
                                className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${isSubActive
                                  ? 'bg-[#eef5f0] text-[#075b3d] font-bold'
                                  : 'text-[#4b5b52] hover:bg-[#f7faf8]'
                                  }`}
                              >
                                <div className={`mt-0.5 flex size-7 items-center justify-center rounded-lg ${isSubActive ? 'bg-[#075b3d] text-white' : 'bg-[#eaf3ee] text-[#075b3d]'
                                  }`}>
                                  <child.icon size={14} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold leading-tight">{child.label}</p>
                                  {child.desc && <p className="text-[10px] text-[#93a097] mt-0.5">{child.desc}</p>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              const active = page === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${active
                    ? 'bg-[#075b3d] text-white shadow-md shadow-[#075b3d]/20'
                    : 'text-[#64746b] hover:bg-[#eef5f0] hover:text-[#087348]'
                    }`}
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                  <Badge role={user.role} id={item.id} user={currentUser} />
                </button>
              )
            })}
          </nav>

          {/* User Profile & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user.role === 'admin' && (
              <button
                onClick={() => {
                  if (confirm('Reset semua data demo ke kondisi awal?')) resetDemo()
                }}
                title="Reset Data Demo"
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#dce7df] px-3 py-1.5 text-[11px] font-medium text-[#708078] hover:bg-[#f1f5f2] transition"
              >
                <RotateCcw size={13} />
                <span>Reset Data</span>
              </button>
            )}

            {/* User Profile Button / Trigger for Settings */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              title="Klik untuk Pengaturan Profil (Ganti Nama / Foto)"
              className="group flex items-center gap-2.5 rounded-2xl bg-[#f7faf8] border border-[#e4ece6] p-1.5 sm:px-3 text-left transition-all hover:bg-[#eef5f0] hover:border-[#a3e635]/40 hover:shadow-md cursor-pointer"
            >
              <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#f5c8a9] text-xs font-bold text-[#663d28] border border-white/60 shadow-sm shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="size-full object-cover" />
                ) : (
                  <span>
                    {currentUser.name
                      .split(' ')
                      .filter(Boolean)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-tight text-[#10251c] group-hover:text-[#075b3d] transition-colors">{currentUser.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="rounded-full bg-[#075b3d]/10 px-1.5 py-0.2 text-[9px] font-bold text-[#075b3d]">
                    {ROLE_LABEL[currentUser.role]}
                  </span>
                  {currentUser.dept && (
                    <span className="text-[10px] text-[#708078] truncate max-w-[90px]">· {currentUser.dept}</span>
                  )}
                </div>
              </div>
            </button>

            <button
              id="logout"
              onClick={onLogout}
              title="Keluar / Logout"
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(239,68,68,0.1)] backdrop-blur-md transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] active:scale-95"
            >
              Logout
            </button>

            {/* Mobile Hamburger Button */}
            <button
              aria-label="Menu navigasi"
              className="flex size-9 items-center justify-center rounded-xl bg-[#f5f7f5] text-[#10251c] lg:hidden hover:bg-[#eef2ef] transition"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {open && (
          <div className="border-t border-[#edf1ee] bg-white px-4 py-3 lg:hidden shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="mb-2 px-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9aa7a0]">
                Navigasi Menu ({ROLE_LABEL[user.role]})
              </span>
              {user.role === 'admin' && (
                <button
                  onClick={() => {
                    if (confirm('Reset semua data demo ke kondisi awal?')) resetDemo()
                    setOpen(false)
                  }}
                  className="text-[10px] font-semibold text-[#075b3d] flex items-center gap-1 hover:underline"
                >
                  <RotateCcw size={11} /> Reset Data
                </button>
              )}
            </div>
            <div className="grid gap-1">
              {nav.map((item) => {
                if (item.isDropdown) {
                  return (
                    <div key={item.id} className="space-y-1 pt-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9aa7a0]">
                        {item.label}
                      </div>
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setPage(child.id)
                            setOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${page === child.id
                            ? 'bg-[#dff4e8] font-bold text-[#087348]'
                            : 'text-[#64746b] hover:bg-[#f5f8f6]'
                            }`}
                        >
                          <span className="flex items-center gap-3">
                            <child.icon size={16} />
                            {child.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                }

                const active = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPage(item.id)
                      setOpen(false)
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${active
                      ? 'bg-[#dff4e8] font-bold text-[#087348]'
                      : 'text-[#64746b] hover:bg-[#f5f8f6]'
                      }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={16} />
                      {item.label}
                    </span>
                    <Badge role={user.role} id={item.id} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main key={page} className="page-enter relative z-10 mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
        {view}
      </main>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        user={currentUser}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onUpdate={(updated) => setCurrentUser(updated)}
      />
    </div>
  )
}

export function AppRoot() {
  const router = useRouter()
  const [user, setUser] = useState<Account | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) router.replace('/login')
    else setUser(s)
    setChecked(true)
  }, [router])

  if (!checked || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-[#031009] text-xs text-[#8fa99b]">
      <div className="flex items-center gap-3"><span className="size-5 animate-spin rounded-full border-2 border-[#a3e635]/25 border-t-[#a3e635]" />Memuat…</div>
    </div>
  )
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell key={user.username} user={user} onLogout={() => { setSession(null); router.replace('/login') }} />
      </ToastProvider>
    </StoreProvider>
  )
}
