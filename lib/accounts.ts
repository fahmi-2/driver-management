export type Role = 'requester' | 'approver' | 'approver_pool' | 'admin' | 'admin_lobby' | 'driver' | 'security' | 'coupon'

export type OrgMatrixItem = {
  dept: string
  managerName: string
  managerEmail: string
  section: string
  sspvName: string
  sspvEmail: string
  adminNames: { name: string; email: string; username: string }[]
}

export type Account = {
  username: string
  password: string
  name: string
  email?: string
  role: Role
  dept?: string
  section?: string
  nik?: string
  driverId?: string // Relasi ke ID driver jika role === 'driver'
  title: string
  avatar?: string
}

// Master Matriks Struktur Organisasi PT. JAI (Dept, Section, Manager, SSPV, Admin/Requester)
export const ORG_MATRIX = [
  // 1. PGA
  {
    dept: 'PGA',
    managerName: 'CAHYO ADI NUGROHO',
    managerEmail: 'cahyo@jai.co.id',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    sspvName: 'HAYU PRASETYO UTOMO',
    sspvEmail: 'hayu.p@jai.co.id',
    adminNames: [
      { name: 'DEWI PURNAMA S.', email: 'gags7@jai.co.id', username: 'dewi.p' },
      { name: 'RICHA FEBRIANI', email: 'gags4@jai.co.id', username: 'richa.f' },
    ],
  },
  {
    dept: 'PGA',
    managerName: 'CAHYO ADI NUGROHO',
    managerEmail: 'cahyo@jai.co.id',
    section: 'HR / IR',
    sspvName: 'ARIE TRI HERTATI',
    sspvEmail: 'arie.t@jai.co.id',
    adminNames: [
      { name: 'RIZKY AMALIA', email: 'rizky.a@jai.co.id', username: 'rizky.a' },
      { name: 'DILLA NAVI', email: 'dilla.n@jai.co.id', username: 'dilla.n' },
    ],
  },
  {
    dept: 'PGA',
    managerName: 'EVIS METHAWAN',
    managerEmail: 'evis.m@jai.co.id',
    section: 'SHE, QSA, PURCHASE',
    sspvName: 'AGUNG INDRAYANA',
    sspvEmail: 'agung.i@jai.co.id',
    adminNames: [
      { name: 'EKA ANGGRAENI', email: 'gags3@jai.co.id', username: 'eka.a' },
      { name: 'ANITA NUR KUMALA', email: 'gags6@jai.co.id', username: 'anita.k' },
    ],
  },

  // 2. FATP-EXIM
  {
    dept: 'FATP-EXIM',
    managerName: 'DEDY HARIAWAN',
    managerEmail: 'dedy.h@jai.co.id',
    section: 'FATP & EXIM',
    sspvName: 'YULI FIKRIYAH',
    sspvEmail: 'yuli.f@jai.co.id',
    adminNames: [
      { name: 'WIJIATI', email: 'exim7@jai.co.id', username: 'wijiati' },
      { name: 'WAHYU MENTARI MAYA', email: 'fin.acc@jai.co.id', username: 'wahyu.m' },
    ],
  },

  // 3. QA
  {
    dept: 'QA',
    managerName: 'KHOLIQ IMAM WAHYUDI',
    managerEmail: 'kholiq@jai.co.id',
    section: 'QA',
    sspvName: 'TONI WIJAYA',
    sspvEmail: 'toni.w@jai.co.id',
    adminNames: [
      { name: 'TITA INDAH', email: 'qa1@jai.co.id', username: 'tita.i' },
      { name: 'FEBY', email: 'febbi.k@jai.co.id', username: 'feby' },
    ],
  },

  // 4. PRODUKSI
  {
    dept: 'PRODUKSI',
    managerName: 'ROBERTUS EDY P.',
    managerEmail: 'robertus.e@jai.co.id',
    section: 'PRODUKSI',
    sspvName: 'ENDANG SRININGSIH',
    sspvEmail: 'endang.s@jai.co.id',
    adminNames: [
      { name: 'NURWIYANTI', email: 'nurwiyanti@jai.co.id', username: 'nurwiyanti' },
      { name: 'NINIS', email: 'nisfiyah.a@jai.co.id', username: 'ninis' },
    ],
  },
  {
    dept: 'PRODUKSI',
    managerName: 'ROBERTUS EDY P.',
    managerEmail: 'robertus.e@jai.co.id',
    section: 'TRAINING',
    sspvName: 'WIWIN WINDARWATI',
    sspvEmail: 'wiwin.w@jai.co.id',
    adminNames: [
      { name: 'DWI ISMAYA', email: 'dwi.i@jai.co.id', username: 'dwi.i' },
      { name: 'SITI NURMUHLISA', email: 'sitinurmuhlisa@jai.co.id', username: 'siti.n' },
    ],
  },

  // 5. PPIC
  {
    dept: 'PPIC',
    managerName: 'DEDI KURNIAWAN PERBAWA',
    managerEmail: 'dedi.k@jai.co.id',
    section: 'PPC',
    sspvName: 'EVANINGSIH MUJIASTUTIK',
    sspvEmail: 'evaningsih@jai.co.id',
    adminNames: [
      { name: 'KETANG PUJI', email: 'ppc7@jai.co.id', username: 'ketang.p' },
    ],
  },
  {
    dept: 'PPIC',
    managerName: 'DEDI KURNIAWAN PERBAWA',
    managerEmail: 'dedi.k@jai.co.id',
    section: 'MPC',
    sspvName: 'EVANINGSIH MUJIASTUTIK',
    sspvEmail: 'evaningsih@jai.co.id',
    adminNames: [
      { name: 'AHMAD DAROJI', email: 'ic4@jai.co.id', username: 'ahmad.d' },
      { name: 'KARTIKA', email: 'kartika.m@jai.co.id', username: 'kartika' },
    ],
  },
  {
    dept: 'PPIC',
    managerName: 'DEDI KURNIAWAN PERBAWA',
    managerEmail: 'dedi.k@jai.co.id',
    section: 'WHS',
    sspvName: 'EVANINGSIH MUJIASTUTIK',
    sspvEmail: 'evaningsih@jai.co.id',
    adminNames: [
      { name: 'BUNGA TALENTA', email: 'bunga.p@jai.co.id', username: 'bunga.t' },
      { name: 'LINDA FURI', email: 'linda.f@jai.co.id', username: 'linda.f' },
    ],
  },

  // 6. PP - NYS
  {
    dept: 'PP - NYS',
    managerName: 'TEGUH WICAKSONO',
    managerEmail: 'teguh.w@jai.co.id',
    section: 'PP',
    sspvName: 'LITA DARMAWANTI',
    sspvEmail: 'lita.d@jai.co.id',
    adminNames: [
      { name: 'LAILA', email: 'lailatul.k@jai.co.id', username: 'laila' },
    ],
  },
  {
    dept: 'PP - NYS',
    managerName: 'TEGUH WICAKSONO',
    managerEmail: 'teguh.w@jai.co.id',
    section: 'NYS',
    sspvName: 'UMAR FAHRONI',
    sspvEmail: 'umar.f@jai.co.id',
    adminNames: [
      { name: 'ELLY', email: 'elly.s@jai.co.id', username: 'elly' },
    ],
  },
  {
    dept: 'PP - NYS',
    managerName: 'TEGUH WICAKSONO',
    managerEmail: 'teguh.w@jai.co.id',
    section: 'DE',
    sspvName: 'UMAR FAHRONI',
    sspvEmail: 'umar.f@jai.co.id',
    adminNames: [
      { name: 'FAJAR YULIANI', email: 'yuliani@jai.co.id', username: 'fajar.y' },
    ],
  },
  {
    dept: 'PP - NYS',
    managerName: 'TEGUH WICAKSONO',
    managerEmail: 'teguh.w@jai.co.id',
    section: 'IT & QC',
    sspvName: 'UMAR FAHRONI',
    sspvEmail: 'umar.f@jai.co.id',
    adminNames: [
      { name: 'ARVITA', email: 'it2.jai@jai.co.id', username: 'arvita' },
    ],
  },

  // 7. ME
  {
    dept: 'ME',
    managerName: 'RATNA ADI YUNIAR',
    managerEmail: 'adi.y@jai.co.id',
    section: 'PE',
    sspvName: 'DANNY HARLI',
    sspvEmail: 'danny.h@jai.co.id',
    adminNames: [
      { name: 'ELLY SUYANTI', email: 'engprod1@jai.co.id', username: 'elly.suyanti' },
    ],
  },
  {
    dept: 'ME',
    managerName: 'RATNA ADI YUNIAR',
    managerEmail: 'adi.y@jai.co.id',
    section: 'PD',
    sspvName: 'DANNY HARLI',
    sspvEmail: 'danny.h@jai.co.id',
    adminNames: [
      { name: 'JAZILA', email: 'engprocess1@jai.co.id', username: 'jazila' },
    ],
  },
  {
    dept: 'ME',
    managerName: 'RATNA ADI YUNIAR',
    managerEmail: 'adi.y@jai.co.id',
    section: 'STOCK CONTROL & SPARE PART CONTROL',
    sspvName: 'M. CHASAN BASRI',
    sspvEmail: 'm.chasan@jai.co.id',
    adminNames: [
      { name: 'SRI NURMAYANTI', email: 'sri.n@jai.co.id', username: 'sri.n' },
    ],
  },
  {
    dept: 'ME',
    managerName: 'RATNA ADI YUNIAR',
    managerEmail: 'adi.y@jai.co.id',
    section: 'MAINTENANCE',
    sspvName: 'M. CHASAN BASRI',
    sspvEmail: 'm.chasan@jai.co.id',
    adminNames: [
      { name: 'DEVI CAROLINA', email: 'mtc2@jai.co.id', username: 'devi.c' },
    ],
  },
]

// Daftar Departemen Unik
export const DEPARTMENTS = Array.from(new Set(ORG_MATRIX.map((m) => m.dept)))

// Fungsi bantu mendapatkan daftar section per departemen
export function getSectionsByDept(dept: string): string[] {
  return Array.from(new Set(ORG_MATRIX.filter((m) => m.dept === dept).map((m) => m.section)))
}

// Fungsi bantu mendapatkan approver (Manager & SSPV) berdasarkan Section & Dept
export function getApproversBySection(dept: string, section?: string): { name: string; email: string; role: string }[] {
  const matching = ORG_MATRIX.filter((m) => m.dept === dept && (!section || m.section === section))
  const approvers: { name: string; email: string; role: string }[] = []
  const seen = new Set<string>()

  matching.forEach((m) => {
    // 1. Manager (Otomatis tujuan utama approve per departemen/section)
    const mgrKey = `Manager: ${m.managerName}`
    if (!seen.has(mgrKey)) {
      seen.add(mgrKey)
      approvers.push({
        name: `${m.managerName} (Manager)`,
        email: m.managerEmail,
        role: 'Manager',
      })
    }

    // 2. SSPV
    const sspvKey = `SSPV: ${m.sspvName}`
    if (!seen.has(sspvKey)) {
      seen.add(sspvKey)
      approvers.push({
        name: `${m.sspvName} (SSPV)`,
        email: m.sspvEmail,
        role: 'SSPV',
      })
    }
  })

  return approvers
}

// Fallback DEPARTMENT_APPROVERS compatibility
export const DEPARTMENT_APPROVERS: Record<string, string[]> = ORG_MATRIX.reduce((acc, cur) => {
  if (!acc[cur.dept]) acc[cur.dept] = []
  const mgr = `${cur.managerName} (Manager)`
  const sspv = `${cur.sspvName} (SSPV)`
  if (!acc[cur.dept].includes(mgr)) acc[cur.dept].push(mgr)
  if (!acc[cur.dept].includes(sspv)) acc[cur.dept].push(sspv)
  return acc
}, {} as Record<string, string[]>)

// Master Akun Resmi Sistem PT. JAI (Semua Dept, Section, Manager, SSPV, Requester, Driver, Security, Kupon)
export const ACCOUNTS: Account[] = [
  // 1. Akun Admin Utama (Pool GA) & Admin Lobby
  {
    username: 'admin1',
    password: 'admin123',
    name: 'Admin Pool GA',
    email: 'admin.pool@jai.co.id',
    role: 'admin',
    dept: 'PGA',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    title: 'Admin Operasional Pool GA',
  },
  {
    username: 'admin_lobby',
    password: 'admin123',
    name: 'Admin Lobby Frontdesk',
    email: 'admin.lobby@jai.co.id',
    role: 'admin_lobby',
    dept: 'PGA',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    title: 'Admin Lobby Frontdesk',
  },

  // 2. Akun SPV Kendaraan (Approver Tahap 2 - Pool GA)
  {
    username: 'hayu.p',
    password: 'spv123',
    name: 'HAYU PRASETYO UTOMO',
    email: 'hayu.p@jai.co.id',
    role: 'approver_pool',
    dept: 'PGA',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    title: 'SPV Kendaraan & Pool GA',
  },

  // 3. Akun Para Manager (Approver Tahap 1)
  {
    username: 'cahyo.n',
    password: 'app123',
    name: 'CAHYO ADI NUGROHO',
    email: 'cahyo@jai.co.id',
    role: 'approver',
    dept: 'PGA',
    title: 'Manager PGA',
  },
  {
    username: 'evis.m',
    password: 'app123',
    name: 'EVIS METHAWAN',
    email: 'evis.m@jai.co.id',
    role: 'approver',
    dept: 'PGA',
    section: 'SHE, QSA, PURCHASE',
    title: 'Manager PGA (SHE, QSA, Purchase)',
  },
  {
    username: 'dedy.h',
    password: 'app123',
    name: 'DEDY HARIAWAN',
    email: 'dedy.h@jai.co.id',
    role: 'approver',
    dept: 'FATP-EXIM',
    section: 'FATP & EXIM',
    title: 'Manager FATP-EXIM',
  },
  {
    username: 'kholiq.w',
    password: 'app123',
    name: 'KHOLIQ IMAM WAHYUDI',
    email: 'kholiq@jai.co.id',
    role: 'approver',
    dept: 'QA',
    section: 'QA',
    title: 'Manager QA',
  },
  {
    username: 'robertus.e',
    password: 'app123',
    name: 'ROBERTUS EDY P.',
    email: 'robertus.e@jai.co.id',
    role: 'approver',
    dept: 'PRODUKSI',
    title: 'Manager PRODUKSI',
  },
  {
    username: 'dedi.k',
    password: 'app123',
    name: 'DEDI KURNIAWAN PERBAWA',
    email: 'dedi.k@jai.co.id',
    role: 'approver',
    dept: 'PPIC',
    title: 'Manager PPIC',
  },
  {
    username: 'teguh.w',
    password: 'app123',
    name: 'TEGUH WICAKSONO',
    email: 'teguh.w@jai.co.id',
    role: 'approver',
    dept: 'PP - NYS',
    title: 'Manager PP - NYS',
  },
  {
    username: 'adi.y',
    password: 'app123',
    name: 'RATNA ADI YUNIAR',
    email: 'adi.y@jai.co.id',
    role: 'approver',
    dept: 'ME',
    title: 'Manager ME',
  },

  // 4. Akun Para SSPV (Approver Tahap 1)
  {
    username: 'arie.t',
    password: 'app123',
    name: 'ARIE TRI HERTATI',
    email: 'arie.t@jai.co.id',
    role: 'approver',
    dept: 'PGA',
    section: 'HR / IR',
    title: 'SSPV HR / IR',
  },
  {
    username: 'agung.i',
    password: 'app123',
    name: 'AGUNG INDRAYANA',
    email: 'agung.i@jai.co.id',
    role: 'approver',
    dept: 'PGA',
    section: 'SHE, QSA, PURCHASE',
    title: 'SSPV SHE, QSA, PURCHASE',
  },
  {
    username: 'yuli.f',
    password: 'app123',
    name: 'YULI FIKRIYAH',
    email: 'yuli.f@jai.co.id',
    role: 'approver',
    dept: 'FATP-EXIM',
    section: 'FATP & EXIM',
    title: 'SSPV FATP & EXIM',
  },
  {
    username: 'toni.w',
    password: 'app123',
    name: 'TONI WIJAYA',
    email: 'toni.w@jai.co.id',
    role: 'approver',
    dept: 'QA',
    section: 'QA',
    title: 'SSPV QA',
  },
  {
    username: 'endang.s',
    password: 'app123',
    name: 'ENDANG SRININGSIH',
    email: 'endang.s@jai.co.id',
    role: 'approver',
    dept: 'PRODUKSI',
    section: 'PRODUKSI',
    title: 'SSPV PRODUKSI',
  },
  {
    username: 'wiwin.w',
    password: 'app123',
    name: 'WIWIN WINDARWATI',
    email: 'wiwin.w@jai.co.id',
    role: 'approver',
    dept: 'PRODUKSI',
    section: 'TRAINING',
    title: 'SSPV TRAINING',
  },
  {
    username: 'evaningsih.m',
    password: 'app123',
    name: 'EVANINGSIH MUJIASTUTIK',
    email: 'evaningsih@jai.co.id',
    role: 'approver',
    dept: 'PPIC',
    section: 'PPC / MPC / WHS',
    title: 'SSPV PPIC (PPC, MPC, WHS)',
  },
  {
    username: 'lita.d',
    password: 'app123',
    name: 'LITA DARMAWANTI',
    email: 'lita.d@jai.co.id',
    role: 'approver',
    dept: 'PP - NYS',
    section: 'PP',
    title: 'SSPV PP',
  },
  {
    username: 'umar.f',
    password: 'app123',
    name: 'UMAR FAHRONI',
    email: 'umar.f@jai.co.id',
    role: 'approver',
    dept: 'PP - NYS',
    section: 'NYS / DE / IT & QC',
    title: 'SSPV NYS, DE, IT & QC',
  },
  {
    username: 'danny.h',
    password: 'app123',
    name: 'DANNY HARLI',
    email: 'danny.h@jai.co.id',
    role: 'approver',
    dept: 'ME',
    section: 'PE / PD',
    title: 'SSPV PE & PD',
  },
  {
    username: 'm.chasan',
    password: 'app123',
    name: 'M. CHASAN BASRI',
    email: 'm.chasan@jai.co.id',
    role: 'approver',
    dept: 'ME',
    section: 'STOCK CONTROL & SPARE PART CONTROL / MAINTENANCE',
    title: 'SSPV Stock Control, Spare Part, Maintenance',
  },

  // 5. Akun Admin / Requester (Pemohon Sesuai Tabel Excel PT. JAI)
  // --- PGA ---
  {
    username: 'dewi.p',
    password: 'user123',
    name: 'DEWI PURNAMA S.',
    email: 'gags7@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    nik: 'JAI-PGA-001',
    title: 'Admin GAGS, Stationary, Utility, Interpreter',
  },
  {
    username: 'richa.f',
    password: 'user123',
    name: 'RICHA FEBRIANI',
    email: 'gags4@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'GAGS, STATIONARY & UTILITY, INTERPRETER',
    nik: 'JAI-PGA-002',
    title: 'Admin GAGS, Stationary, Utility, Interpreter',
  },
  {
    username: 'rizky.a',
    password: 'user123',
    name: 'RIZKY AMALIA',
    email: 'rizky.a@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'HR / IR',
    nik: 'JAI-PGA-003',
    title: 'Admin HR / IR',
  },
  {
    username: 'dilla.n',
    password: 'user123',
    name: 'DILLA NAVI',
    email: 'dilla.n@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'HR / IR',
    nik: 'JAI-PGA-004',
    title: 'Admin HR / IR',
  },
  {
    username: 'eka.a',
    password: 'user123',
    name: 'EKA ANGGRAENI',
    email: 'gags3@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'SHE, QSA, PURCHASE',
    nik: 'JAI-PGA-005',
    title: 'Admin SHE, QSA, Purchase',
  },
  {
    username: 'anita.k',
    password: 'user123',
    name: 'ANITA NUR KUMALA',
    email: 'gags6@jai.co.id',
    role: 'requester',
    dept: 'PGA',
    section: 'SHE, QSA, PURCHASE',
    nik: 'JAI-PGA-006',
    title: 'Admin SHE, QSA, Purchase',
  },

  // --- FATP-EXIM ---
  {
    username: 'wijiati',
    password: 'user123',
    name: 'WIJIATI',
    email: 'exim7@jai.co.id',
    role: 'requester',
    dept: 'FATP-EXIM',
    section: 'FATP & EXIM',
    nik: 'JAI-EXIM-001',
    title: 'Admin Exim',
  },
  {
    username: 'wahyu.m',
    password: 'user123',
    name: 'WAHYU MENTARI MAYA',
    email: 'fin.acc@jai.co.id',
    role: 'requester',
    dept: 'FATP-EXIM',
    section: 'FATP & EXIM',
    nik: 'JAI-FIN-001',
    title: 'Admin Finance & Accounting',
  },

  // --- QA ---
  {
    username: 'tita.i',
    password: 'user123',
    name: 'TITA INDAH',
    email: 'qa1@jai.co.id',
    role: 'requester',
    dept: 'QA',
    section: 'QA',
    nik: 'JAI-QA-001',
    title: 'Admin QA',
  },
  {
    username: 'feby',
    password: 'user123',
    name: 'FEBY',
    email: 'febbi.k@jai.co.id',
    role: 'requester',
    dept: 'QA',
    section: 'QA',
    nik: 'JAI-QA-002',
    title: 'Admin QA',
  },

  // --- PRODUKSI ---
  {
    username: 'nurwiyanti',
    password: 'user123',
    name: 'NURWIYANTI',
    email: 'nurwiyanti@jai.co.id',
    role: 'requester',
    dept: 'PRODUKSI',
    section: 'PRODUKSI',
    nik: 'JAI-PRD-001',
    title: 'Admin Produksi',
  },
  {
    username: 'ninis',
    password: 'user123',
    name: 'NINIS',
    email: 'nisfiyah.a@jai.co.id',
    role: 'requester',
    dept: 'PRODUKSI',
    section: 'PRODUKSI',
    nik: 'JAI-PRD-002',
    title: 'Admin Produksi',
  },
  {
    username: 'dwi.i',
    password: 'user123',
    name: 'DWI ISMAYA',
    email: 'dwi.i@jai.co.id',
    role: 'requester',
    dept: 'PRODUKSI',
    section: 'TRAINING',
    nik: 'JAI-TRN-001',
    title: 'Admin Training',
  },
  {
    username: 'siti.n',
    password: 'user123',
    name: 'SITI NURMUHLISA',
    email: 'sitinurmuhlisa@jai.co.id',
    role: 'requester',
    dept: 'PRODUKSI',
    section: 'TRAINING',
    nik: 'JAI-TRN-002',
    title: 'Admin Training',
  },

  // --- PPIC ---
  {
    username: 'ketang.p',
    password: 'user123',
    name: 'KETANG PUJI',
    email: 'ppc7@jai.co.id',
    role: 'requester',
    dept: 'PPIC',
    section: 'PPC',
    nik: 'JAI-PPC-001',
    title: 'Admin PPC',
  },
  {
    username: 'ahmad.d',
    password: 'user123',
    name: 'AHMAD DAROJI',
    email: 'ic4@jai.co.id',
    role: 'requester',
    dept: 'PPIC',
    section: 'MPC',
    nik: 'JAI-MPC-001',
    title: 'Admin MPC',
  },
  {
    username: 'kartika',
    password: 'user123',
    name: 'KARTIKA',
    email: 'kartika.m@jai.co.id',
    role: 'requester',
    dept: 'PPIC',
    section: 'MPC',
    nik: 'JAI-MPC-002',
    title: 'Admin MPC',
  },
  {
    username: 'bunga.t',
    password: 'user123',
    name: 'BUNGA TALENTA',
    email: 'bunga.p@jai.co.id',
    role: 'requester',
    dept: 'PPIC',
    section: 'WHS',
    nik: 'JAI-WHS-001',
    title: 'Admin Warehouse (WHS)',
  },
  {
    username: 'linda.f',
    password: 'user123',
    name: 'LINDA FURI',
    email: 'linda.f@jai.co.id',
    role: 'requester',
    dept: 'PPIC',
    section: 'WHS',
    nik: 'JAI-WHS-002',
    title: 'Admin Warehouse (WHS)',
  },

  // --- PP - NYS ---
  {
    username: 'laila',
    password: 'user123',
    name: 'LAILA',
    email: 'lailatul.k@jai.co.id',
    role: 'requester',
    dept: 'PP - NYS',
    section: 'PP',
    nik: 'JAI-PP-001',
    title: 'Admin PP',
  },
  {
    username: 'elly',
    password: 'user123',
    name: 'ELLY',
    email: 'elly.s@jai.co.id',
    role: 'requester',
    dept: 'PP - NYS',
    section: 'NYS',
    nik: 'JAI-NYS-001',
    title: 'Admin NYS',
  },
  {
    username: 'fajar.y',
    password: 'user123',
    name: 'FAJAR YULIANI',
    email: 'yuliani@jai.co.id',
    role: 'requester',
    dept: 'PP - NYS',
    section: 'DE',
    nik: 'JAI-DE-001',
    title: 'Admin DE',
  },
  {
    username: 'arvita',
    password: 'user123',
    name: 'ARVITA',
    email: 'it2.jai@jai.co.id',
    role: 'requester',
    dept: 'PP - NYS',
    section: 'IT & QC',
    nik: 'JAI-IT-001',
    title: 'Admin IT & QC',
  },

  // --- ME ---
  {
    username: 'elly.suyanti',
    password: 'user123',
    name: 'ELLY SUYANTI',
    email: 'engprod1@jai.co.id',
    role: 'requester',
    dept: 'ME',
    section: 'PE',
    nik: 'JAI-ME-001',
    title: 'Admin PE',
  },
  {
    username: 'jazila',
    password: 'user123',
    name: 'JAZILA',
    email: 'engprocess1@jai.co.id',
    role: 'requester',
    dept: 'ME',
    section: 'PD',
    nik: 'JAI-ME-002',
    title: 'Admin PD',
  },
  {
    username: 'sri.n',
    password: 'user123',
    name: 'SRI NURMAYANTI',
    email: 'sri.n@jai.co.id',
    role: 'requester',
    dept: 'ME',
    section: 'STOCK CONTROL & SPARE PART CONTROL',
    nik: 'JAI-ME-003',
    title: 'Admin Stock & Spare Part Control',
  },
  {
    username: 'devi.c',
    password: 'user123',
    name: 'DEVI CAROLINA',
    email: 'mtc2@jai.co.id',
    role: 'requester',
    dept: 'ME',
    section: 'MAINTENANCE',
    nik: 'JAI-ME-004',
    title: 'Admin Maintenance',
  },

  // 6. Akun Expat (Requester VIP)
  { username: 'fujiyoshi', password: 'user123', name: 'FUJIYOSHI', role: 'requester', dept: 'PGA', title: 'Expat User' },
  { username: 'isoda', password: 'user123', name: 'ISODA', role: 'requester', dept: 'PGA', title: 'Expat User' },
  { username: 'kato', password: 'user123', name: 'KATO', role: 'requester', dept: 'PGA', title: 'Expat User' },
  { username: 'tateishi', password: 'user123', name: 'TATEISHI', role: 'requester', dept: 'PGA', title: 'Expat User' },

  // 7. Akun Driver Operasional (8 Driver Resmi PT. JAI)
  { username: 'taufik', password: 'drv123', name: 'TAUFIK', role: 'driver', driverId: 'DRV-001', title: 'Driver Innova Zenix W 1318 TI' },
  { username: 'ghofur', password: 'drv123', name: 'GHOFUR', role: 'driver', driverId: 'DRV-002', title: 'Driver Innova Reborn W 1156 QY' },
  { username: 'hendro', password: 'drv123', name: 'HENDRO', role: 'driver', driverId: 'DRV-003', title: 'Driver Innova Reborn W 1460 NE' },
  { username: 'thamrin', password: 'drv123', name: 'THAMRIN', role: 'driver', driverId: 'DRV-004', title: 'Driver Innova Zenix L 1005 DBU' },
  { username: 'sahari', password: 'drv123', name: 'SAHARI', role: 'driver', driverId: 'DRV-005', title: 'Driver Avanza W 1458 NE' },
  { username: 'ichsan', password: 'drv123', name: 'ICHSAN', role: 'driver', driverId: 'DRV-006', title: 'Driver Avanza L 1508 DBR' },
  { username: 'karyadi', password: 'drv123', name: 'KARYADI', role: 'driver', driverId: 'DRV-007', title: 'Driver Avanza L 1910 DAS' },
  { username: 'indra', password: 'drv123', name: 'INDRA', role: 'driver', driverId: 'DRV-008', title: 'Driver Avanza W 1459 NE' },

  // 8. Security & Kupon
  { username: 'security', password: 'security123', name: 'Pak Slamet', role: 'security', title: 'Security Gerbang' },
  { username: 'kupon', password: 'kupon123', name: 'Siska Wulandari', role: 'coupon', title: 'Admin Kupon' },
]

export const ROLE_LABEL: Record<Role, string> = {
  requester: 'Requester (Pemohon)',
  approver: 'Approver SPV Departemen (Tahap 1)',
  approver_pool: 'Approver SPV Kendaraan (Tahap 2)',
  admin: 'Super Admin (Pool GA)',
  admin_lobby: 'Admin Lobby Frontdesk',
  driver: 'Driver (Sopir)',
  security: 'Security Gerbang',
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

const ACCOUNTS_STORAGE_KEY = 'ff_all_accounts_v2'

export function resetToDefaultAccounts(): Account[] {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(ACCOUNTS))
    window.dispatchEvent(new Event('accounts_updated'))
  }
  return ACCOUNTS
}

export function getAllAccounts(): Account[] {
  if (typeof window === 'undefined') return ACCOUNTS
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (!raw) {
      // Inisialisasi awal dengan ACCOUNTS bawaan matriks resmi
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(ACCOUNTS))
      return ACCOUNTS
    }
    let parsed = JSON.parse(raw) as Account[]
    // Pastikan jika ada akun bawaan baru (misal admin_lobby) otomatis terinjeksi jika belum ada di storage
    let needsUpdate = false
    for (const defAcc of ACCOUNTS) {
      if (!parsed.some((p) => p.username.toLowerCase() === defAcc.username.toLowerCase())) {
        parsed.push(defAcc)
        needsUpdate = true
      }
    }
    if (needsUpdate) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsed))
    }
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

export async function syncAccountsWithSupabase(): Promise<Account[]> {
  if (typeof window === 'undefined') return ACCOUNTS
  try {
    const { fetchAccountsFromSupabase } = await import('./sync')
    const remote = await fetchAccountsFromSupabase()
    if (remote && remote.length > 0) {
      // Pastikan akun default penting (seperti admin1, admin_lobby) tidak hilang jika remote belum lengkap
      let merged = [...remote]
      let hasNew = false
      for (const defAcc of ACCOUNTS) {
        if (!merged.some((m) => m.username.toLowerCase() === defAcc.username.toLowerCase())) {
          merged.push(defAcc)
          hasNew = true
        }
      }
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged))
      window.dispatchEvent(new Event('accounts_updated'))
      return merged
    }
  } catch (err) {
    console.error('Failed to sync accounts from Supabase:', err)
  }
  return getAllAccounts()
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
  // Admin utama & Admin lobby bawaan tidak boleh dihapus
  if (cleanUsername === 'admin' || cleanUsername === 'admin1' || cleanUsername === 'admin_lobby') {
    return { success: false, message: 'Akun Admin Sistem tidak boleh dihapus!' }
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
