export type Role = 'requester' | 'admin' | 'security' | 'coupon'

export type Account = {
  username: string
  password: string
  name: string
  role: Role
  dept?: string
  title: string
}

// Akun demo (client-side only). SPV tidak punya akun: approval via Magic Link email.
export const ACCOUNTS: Account[] = [
  { username: 'requester1', password: 'req123', name: 'Rina Kartika', role: 'requester', dept: 'Procurement', title: 'Admin Departemen Procurement' },
  { username: 'requester2', password: 'req123', name: 'Taufik Hidayat', role: 'requester', dept: 'Engineering', title: 'Admin Departemen Engineering' },
  { username: 'admin', password: 'admin123', name: 'Andi Suryana', role: 'admin', title: 'Admin Utama (Pool GA)' },
  { username: 'security', password: 'security123', name: 'Pak Slamet', role: 'security', title: 'Security Gerbang' },
  { username: 'kupon', password: 'kupon123', name: 'Siska Wulandari', role: 'coupon', title: 'Admin Kupon' },
]

export const ROLE_LABEL: Record<Role, string> = {
  requester: 'Requester',
  admin: 'Admin Utama (Pool GA)',
  security: 'Security',
  coupon: 'Admin Kupon',
}

export function findAccount(username: string, password: string) {
  return ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
}

const KEY = 'ff_session'
export function getSession(): Account | null {
  if (typeof window === 'undefined') return null
  const u = window.localStorage.getItem(KEY)
  return ACCOUNTS.find((a) => a.username === u) ?? null
}
export function setSession(username: string | null) {
  if (username) window.localStorage.setItem(KEY, username)
  else window.localStorage.removeItem(KEY)
}
