export type Role = 'requester' | 'admin' | 'security' | 'coupon'

export type Account = {
  username: string
  password: string
  name: string
  role: Role
  dept?: string
  title: string
  avatar?: string
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

const PROFILES_KEY = 'ff_custom_profiles'

export function getCustomProfiles(): Record<string, Partial<Account>> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveUserProfile(username: string, updates: Partial<Account>) {
  if (typeof window === 'undefined') return
  try {
    const current = getCustomProfiles()
    current[username] = { ...current[username], ...updates }
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(current))
    // Trigger custom event so any listener updates state
    window.dispatchEvent(new Event('profile_updated'))
  } catch (err) {
    console.error('Failed to save profile', err)
  }
}

export function findAccount(username: string, password: string) {
  const base = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
  if (!base) return null
  const customs = getCustomProfiles()
  const custom = customs[base.username]
  return custom ? { ...base, ...custom } : base
}

const KEY = 'ff_session'
export function getSession(): Account | null {
  if (typeof window === 'undefined') return null
  // Cek sessionStorage terlebih dahulu (per tab aktif)
  const u = window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY)
  if (!u) return null
  const base = ACCOUNTS.find((a) => a.username === u)
  if (!base) return null
  const customs = getCustomProfiles()
  const custom = customs[base.username]
  return custom ? { ...base, ...custom } : base
}

export function setSession(username: string | null, remember: boolean = true) {
  if (typeof window === 'undefined') return
  if (username) {
    window.sessionStorage.setItem(KEY, username)
    if (remember) {
      window.localStorage.setItem(KEY, username)
    }
  } else {
    window.sessionStorage.removeItem(KEY)
    window.localStorage.removeItem(KEY)
  }
}
