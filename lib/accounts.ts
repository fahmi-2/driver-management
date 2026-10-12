export type Role = 'requester' | 'approver' | 'admin' | 'driver' | 'security' | 'coupon'

export type Account = {
  username: string
  password: string
  name: string
  role: Role
  dept?: string
  nik?: string
  driverId?: string // Relasi ke ID driver jika role === 'driver'
  title: string
  avatar?: string
}

// Master data Departemen & Approver (Manajer / SSPV / SPV)
export const DEPARTMENT_APPROVERS: Record<string, string[]> = {
  Procurement: ['Bpk. Hendro Siswanto (Manager)', 'Ibu Dewi Sartika (SSPV)', 'Bpk. Ahmad Fauzi (SPV)'],
  Engineering: ['Bpk. Ir. Bambang Wicaksono (Manager)', 'Bpk. Satrio Utomo (SSPV)', 'Ibu Maya Anggraini (SPV)'],
  Production: ['Bpk. Agus Santoso (Manager)', 'Bpk. Joko Prayitno (SSPV)', 'Bpk. Tri Wibowo (SPV)'],
  'Quality Control': ['Ibu Ratna Kumala (Manager)', 'Bpk. Dimas Ardiansyah (SSPV)', 'Ibu Fitri Handayani (SPV)'],
  'HR & GA': ['Bpk. Heru Purnomo (Manager)', 'Ibu Indah Permata (SSPV)', 'Bpk. Doni Kusuma (SPV)'],
  Finance: ['Ibu Sri Wahyuni (Manager)', 'Bpk. Eko Prasetyo (SSPV)', 'Ibu Anisa Rahma (SPV)'],
  Maintenance: ['Bpk. Rudi Hartono (Manager)', 'Bpk. Yudi Pratama (SSPV)', 'Bpk. Gunawan (SPV)'],
  Warehouse: ['Bpk. Dedi Supriyadi (Manager)', 'Bpk. Fajar Ramadhan (SSPV)', 'Ibu Citra Lestari (SPV)'],
}

export const DEPARTMENTS = Object.keys(DEPARTMENT_APPROVERS)

// Akun demo sistem: Approver login untuk e-sign, Driver login untuk dasbor jadwal pribadi
export const ACCOUNTS: Account[] = [
  { username: 'requester1', password: 'req123', name: 'Rina Kartika', nik: 'JAI-2018042', role: 'requester', dept: 'Procurement', title: 'Admin Departemen Procurement' },
  { username: 'requester2', password: 'req123', name: 'Taufik Hidayat', nik: 'JAI-2019115', role: 'requester', dept: 'Engineering', title: 'Admin Departemen Engineering' },
  { username: 'approver1', password: 'app123', name: 'Bpk. Ahmad Fauzi (SPV)', nik: 'JAI-2014009', role: 'approver', dept: 'Procurement', title: 'SPV Departemen Procurement' },
  { username: 'approver2', password: 'app123', name: 'Bpk. Satrio Utomo (SSPV)', nik: 'JAI-2013018', role: 'approver', dept: 'Engineering', title: 'SSPV Departemen Engineering' },
  { username: 'spv_pool', password: 'spv123', name: 'Bpk. Heru Purnomo (Manager)', nik: 'JAI-2011002', role: 'approver', dept: 'HR & GA', title: 'SPV Kendaraan & Pool GA (Final E-Sign)' },
  { username: 'driver1', password: 'drv123', name: 'Budi Santoso', nik: 'JAI-DRV001', role: 'driver', driverId: 'd1', title: 'Driver Operasional (Innova B 1824 KQA)' },
  { username: 'driver2', password: 'drv123', name: 'Agus Pranoto', nik: 'JAI-DRV002', role: 'driver', driverId: 'd2', title: 'Driver Operasional (Avanza B 2901 TSI)' },
  { username: 'admin', password: 'admin123', name: 'Andi Suryana', nik: 'JAI-2015003', role: 'admin', title: 'Admin Utama (Pool GA)' },
  { username: 'security', password: 'security123', name: 'Pak Slamet', nik: 'JAI-2016089', role: 'security', title: 'Security Gerbang' },
  { username: 'kupon', password: 'kupon123', name: 'Siska Wulandari', nik: 'JAI-2020054', role: 'coupon', title: 'Admin Kupon' },
]

export const ROLE_LABEL: Record<Role, string> = {
  requester: 'Requester',
  approver: 'Approver (SPV / Manager)',
  admin: 'Admin Utama (Pool GA)',
  driver: 'Driver (Sopir)',
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

const ACCOUNTS_STORAGE_KEY = 'ff_all_accounts'

export function getAllAccounts(): Account[] {
  if (typeof window === 'undefined') return ACCOUNTS
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (!raw) {
      // Inisialisasi awal dengan ACCOUNTS bawaan
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(ACCOUNTS))
      return ACCOUNTS
    }
    const parsed = JSON.parse(raw) as Account[]
    // Gabungkan dengan custom profiles jika ada
    const customs = getCustomProfiles()
    return parsed.map((acc) => {
      const custom = customs[acc.username]
      return custom ? { ...acc, ...custom } : acc
    })
  } catch {
    return ACCOUNTS
  }
}

export function saveAllAccounts(accounts: Account[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
    window.dispatchEvent(new Event('accounts_updated'))
  } catch (err) {
    console.error('Failed to save accounts', err)
  }
}

export function addAccount(newAcc: Account): { success: boolean; message?: string } {
  const current = getAllAccounts()
  const cleanUsername = newAcc.username.trim().toLowerCase()
  if (current.some((a) => a.username.toLowerCase() === cleanUsername)) {
    return { success: false, message: 'Username sudah digunakan!' }
  }
  const fullAcc = { ...newAcc, username: cleanUsername }
  const updated = [...current, fullAcc]
  saveAllAccounts(updated)
  // Async sync ke Supabase
  import('./sync').then(({ upsertAccountToSupabase }) => upsertAccountToSupabase(fullAcc))
  return { success: true }
}

export function updateAccount(originalUsername: string, updates: Partial<Account>): { success: boolean; message?: string } {
  const current = getAllAccounts()
  const origClean = originalUsername.trim().toLowerCase()
  const targetIdx = current.findIndex((a) => a.username.toLowerCase() === origClean)
  if (targetIdx === -1) {
    return { success: false, message: 'Akun tidak ditemukan!' }
  }

  // Jika username diubah, cek apakah username baru sudah terpakai
  if (updates.username && updates.username.trim().toLowerCase() !== origClean) {
    const newClean = updates.username.trim().toLowerCase()
    if (current.some((a, idx) => idx !== targetIdx && a.username.toLowerCase() === newClean)) {
      return { success: false, message: 'Username baru sudah digunakan oleh akun lain!' }
    }
    updates.username = newClean

    // Update juga session jika akun yang sedang login diubah usernamenya
    const curSession = getSession()
    if (curSession && curSession.username.toLowerCase() === origClean) {
      setSession(newClean)
    }
  }

  const updatedAcc = { ...current[targetIdx], ...updates }
  const updatedList = [...current]
  updatedList[targetIdx] = updatedAcc
  saveAllAccounts(updatedList)
  // Async sync ke Supabase
  import('./sync').then(({ upsertAccountToSupabase }) => upsertAccountToSupabase(updatedAcc))
  return { success: true }
}

export function deleteAccount(username: string): { success: boolean; message?: string } {
  const cleanUsername = username.trim().toLowerCase()
  // Admin utama tidak boleh dihapus
  if (cleanUsername === 'admin') {
    return { success: false, message: 'Akun Admin Utama tidak boleh dihapus!' }
  }

  const curSession = getSession()
  if (curSession && curSession.username.toLowerCase() === cleanUsername) {
    return { success: false, message: 'Tidak dapat menghapus akun yang sedang Anda gunakan saat ini!' }
  }

  const current = getAllAccounts()
  const filtered = current.filter((a) => a.username.toLowerCase() !== cleanUsername)
  saveAllAccounts(filtered)
  // Async delete dari Supabase
  import('./sync').then(({ deleteAccountFromSupabase }) => deleteAccountFromSupabase(cleanUsername))
  return { success: true }
}

export function verifyAdminPassword(adminPasswordInput: string): boolean {
  const all = getAllAccounts()
  const adminAcc = all.find((a) => a.role === 'admin' && a.username.toLowerCase() === 'admin') || all.find((a) => a.role === 'admin')
  if (!adminAcc) return adminPasswordInput === 'admin123'
  return adminAcc.password === adminPasswordInput
}

export function findAccount(username: string, password: string) {
  const all = getAllAccounts()
  const base = all.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
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
  const all = getAllAccounts()
  const base = all.find((a) => a.username === u)
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
