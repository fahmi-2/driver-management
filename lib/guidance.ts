import type { Role } from './accounts'

export type Slide = {
  id: string
  title: string
  subtitle?: string
  content: string
  points?: string[]
  badge?: string
  accentColor?: string
  illustrationType?: 'car' | 'shield' | 'check' | 'calendar' | 'ticket' | 'driver' | 'admin' | 'matrix'
  externalLink?: string
  imageUrl?: string // URL screenshot halaman nyata (jika sudah ada file)
  uiContextType?:
    | 'requester_form'
    | 'requester_tracking'
    | 'approver_inbox'
    | 'admin_timeline'
    | 'admin_accounts'
    | 'driver_tasks'
    | 'security_gate'
    | 'coupon_claims'
    | 'default'
}

export type RoleGuidance = {
  role: Role
  title: string
  description: string
  pptEmbedUrl?: string // Opsional: jika ingin embed langsung dari link PPT / Canva / Google Slides / OneDrive
  autoPlayInterval?: number // Detik per slide (default 6 detik)
  slides: Slide[]
}

const STORAGE_KEY = 'jai_fleet_guidances_v1'

export const DEFAULT_GUIDANCES: Record<Role, RoleGuidance> = {
  admin: {
    role: 'admin',
    title: 'Panduan Operasional Admin Utama (Pool GA)',
    description: 'SOP dan panduan lengkap bagi Admin Utama Pool GA dalam mengelola jadwal, armada, supir, dan akun sistem PT. JAI.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'adm-1',
        title: 'Selamat Datang di Portal Admin Utama',
        subtitle: 'JAI-FLEET Gas Operations',
        badge: 'SLIDE 1 · OVERVIEW',
        accentColor: '#10b981',
        illustrationType: 'admin',
        uiContextType: 'admin_timeline',
        content: 'Sebagai Admin Utama Pool GA, Anda memiliki kendali operasional penuh untuk memastikan mobilitas dinas seluruh departemen PT. JAI berjalan aman, efisien, dan terpantau akurat.',
        points: [
          'Memetakan penugasan armada & driver sesuai jadwal prioritas.',
          'Mengelola master data mobil, personil driver, dan otorisasi akun pengguna.',
          'Memantau utilisasi armada secara real-time dari Live Kanban & Timeline.',
        ],
      },
      {
        id: 'adm-2',
        title: 'Penjadwalan via Interactive Timeline',
        subtitle: 'Modul Waiting List & Scheduling Center',
        badge: 'SLIDE 2 · SCHEDULING',
        accentColor: '#3b82f6',
        illustrationType: 'calendar',
        uiContextType: 'admin_timeline',
        content: 'Penjadwalan dilakukan secara interaktif dengan sistem Drag & Drop pada timeline slot jam 06:00 s.d 22:00.',
        points: [
          'Pilih tiket permohonan berstatus WAITING_ASSIGN dari kolom antrean kiri.',
          'Klik dan seret (drag) pada baris kendaraan & rentang jam yang dikehendaki.',
          'Pilih driver yang standby dan input catatan admin (misal rute khusus / instruksi jalan).',
          'Klik Simpan: Status tiket otomatis beralih ke WAITING_POOL_SPV untuk persetujuan SPV Kendaraan.',
        ],
      },
      {
        id: 'adm-3',
        title: 'Opsi Mobil Lain / Mobil Manajer',
        subtitle: 'Antisipasi Lonjakan Kebutuhan Armada',
        badge: 'SLIDE 3 · FLEET FLEXIBILITY',
        accentColor: '#8b5cf6',
        illustrationType: 'car',
        uiContextType: 'admin_timeline',
        content: 'Jika seluruh unit armada operasional (Zenix, Reborn, Avanza) telah terisi penuh, Admin dapat menugaskan supir dengan unit alternatif.',
        points: [
          'Centang opsi "Gunakan Mobil Lain / Mobil Manajer" pada modal penjadwalan.',
          'Pilih driver yang ditugaskan; sistem otomatis mengamankan mobil default supir agar tidak terjadi bentrok.',
          'Mencatat nomor polisi / nama mobil cadangan yang digunakan.',
        ],
      },
      {
        id: 'adm-4',
        title: 'Manajemen Data Akun & Keamanan Sistem',
        subtitle: 'Eksklusif Hak Akses Admin Utama',
        badge: 'SLIDE 4 · SECURITY & PRIVACY',
        accentColor: '#f59e0b',
        illustrationType: 'shield',
        uiContextType: 'admin_accounts',
        content: 'Kelola data pengguna, peranan PIC, dan kredensial akun seluruh karyawan PT. JAI.',
        points: [
          'Hanya Admin Utama yang memiliki akses ke menu Data Akun.',
          'Melihat password pengguna dilindungi dengan verifikasi password admin.',
          'Dapat menambahkan akun baru, mengubah jabatan, departemen, atau mereset password.',
        ],
      },
      {
        id: 'adm-5',
        title: 'Monitoring Live Data & Beban Kerja Driver',
        subtitle: 'Evaluasi & Pemerataan Ritase Kerja',
        badge: 'SLIDE 5 · ANALYTICS',
        accentColor: '#06b6d4',
        illustrationType: 'matrix',
        uiContextType: 'admin_timeline',
        content: 'Menjaga kesehatan operasional dan keadilan beban tugas 8 supir resmi PT. JAI.',
        points: [
          'Pantau durasi dinas aktual dan waktu keluar/masuk pos gerbang security.',
          'Periksa grafik ritase harian di menu Beban Kerja agar tidak ada driver yang kelelahan.',
          'Ekspor rekapitulasi data perjalanan untuk laporan bulanan manajemen PGA.',
        ],
      },
    ],
  },
  admin_lobby: {
    role: 'admin_lobby',
    title: 'Panduan Operasional Admin Lobby (Frontdesk)',
    description: 'Panduan pelaksanaan tugas harian Admin Meja Depan (Lobby Frontdesk) dalam operasional armada PT. JAI.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'lob-1',
        title: 'Peran & Tanggung Jawab Admin Lobby',
        subtitle: 'Pelayanan Cepat di Garis Depan',
        badge: 'SLIDE 1 · FRONTDESK',
        accentColor: '#0ea5e9',
        illustrationType: 'admin',
        uiContextType: 'admin_timeline',
        content: 'Admin Lobby bertindak sebagai perpanjangan tangan operasional di frontdesk untuk membantu koordinasi tamu, keberangkatan dinas, dan penjadwalan kendaraan harian.',
        points: [
          'Dapat memetakan jadwal dan memilih supir di menu Waiting List & Jadwal.',
          'Memperbarui status ketersediaan armada dan nomor kontak driver.',
          'Memiliki akses fitur yang sama dengan Admin Utama, kecuali Kelola Data Akun pengguna.',
        ],
      },
      {
        id: 'lob-2',
        title: 'Koordinasi Tamu & Permohonan Urgent',
        subtitle: 'Penanganan Tamu Perusahaan & Expat',
        badge: 'SLIDE 2 · GUEST SERVICE',
        accentColor: '#10b981',
        illustrationType: 'car',
        uiContextType: 'admin_timeline',
        content: 'Pastikan kesiapan armada dan driver saat menerima kedatangan tamu eksternal maupun penjemputan bandara/stasiun.',
        points: [
          'Cek tiket berstatus READY pada Dashboard untuk memastikan supir sudah bersiap.',
          'Berikan arahan ruang tunggu lobby kepada tamu sebelum dijemput oleh supir.',
          'Gunakan catatan khusus pada jadwal jika ada permintaan bagasi atau rute multi-stop.',
        ],
      },
      {
        id: 'lob-3',
        title: 'Pemantauan Gate Out & Kesiapan Armada',
        subtitle: 'Sinkronisasi dengan Pos Security',
        badge: 'SLIDE 3 · GATE SYNC',
        accentColor: '#f59e0b',
        illustrationType: 'check',
        uiContextType: 'security_gate',
        content: 'Melihat status keberangkatan mobil dari pos gerbang keluar secara live.',
        points: [
          'Status ON_TRIP menandakan mobil telah melalui Gate Out pos security.',
          'Jika ada keterlambatan kepulangan, koordinasikan dengan driver melalui nomor telepon yang tertera.',
        ],
      },
    ],
  },
  requester: {
    role: 'requester',
    title: 'Panduan Pemohon Kendaraan (Requester)',
    description: 'Tata cara pengajuan mobil dinas, pemilihan rute tujuan, pendaftaran penumpang, dan pemantauan approval.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'req-1',
        title: 'Cara Mengajukan Permohonan Kendaraan',
        subtitle: 'Langkah 1: Mengisi Formulir Dinas',
        badge: 'SLIDE 1 · SUBMIT REQUEST',
        accentColor: '#10b981',
        illustrationType: 'car',
        uiContextType: 'requester_form',
        content: 'Isi formulir pada menu "Ajukan Kendaraan" dengan data yang lengkap dan akurat sebelum jadwal keberangkatan.',
        points: [
          'Tentukan tanggal dan jam keberangkatan serta estimasi jam kembali.',
          'Isi Nama Tamu / PIC Perjalanan dan rute tujuan dinas.',
          'Pilih peruntukan (Operasional / Expat / Darurat).',
        ],
      },
      {
        id: 'req-2',
        title: 'Daftar Penumpang & Multi-Destinasi',
        subtitle: 'Langkah 2: Rincian Anggota Dinas',
        badge: 'SLIDE 2 · PASSENGERS',
        accentColor: '#3b82f6',
        illustrationType: 'matrix',
        uiContextType: 'requester_form',
        content: 'Sistem mendukung input banyak penumpang dan rekomendasi otomatis nama tempat tujuan di Jawa Timur.',
        points: [
          'Tambahkan NIK dan nama rekan satu perjalanan.',
          'Gunakan fitur autocomplete tujuan untuk mempercepat pengisian alamat tujuan dinas.',
        ],
      },
      {
        id: 'req-3',
        title: 'Alur Persetujuan & Notifikasi E-Pass',
        subtitle: 'Langkah 3: Tracking Status Pengajuan',
        badge: 'SLIDE 3 · TRACKING',
        accentColor: '#8b5cf6',
        illustrationType: 'check',
        uiContextType: 'requester_tracking',
        content: 'Pantau tiket Anda pada menu "Notifikasi & Riwayat".',
        points: [
          'Tahap 1: Menunggu persetujuan SPV/Manager departemen Anda (WAITING_SPV).',
          'Tahap 2: Dipetakan armada & supir oleh Admin GA (WAITING_ASSIGN).',
          'Tahap 3: Disetujui SPV Kendaraan (WAITING_POOL_SPV).',
          'Status READY: E-Pass resmi terbit, supir dan mobil siap berangkat di pos gerbang.',
        ],
      },
      {
        id: 'req-4',
        title: 'Klaim Kupon Perjalanan Dinas',
        subtitle: 'Langkah 4: Panel Kupon',
        badge: 'SLIDE 4 · COUPON CLAIM',
        accentColor: '#f59e0b',
        illustrationType: 'ticket',
        uiContextType: 'coupon_claims',
        content: 'Jika perjalanan dinas melebihi ketentuan jam makan/transport, pemohon dapat mengajukan klaim kupon.',
        points: [
          'Masuk ke menu "Panel Kupon" dan pilih tiket perjalanan yang memenuhi syarat.',
          'Ajukan verifikasi klaim ke Admin Kupon / Tim Keuangan.',
        ],
      },
    ],
  },
  approver: {
    role: 'approver',
    title: 'Panduan Persetujuan SPV/Manager (Approver Tahap 1)',
    description: 'Panduan verifikasi dan E-Sign persetujuan permohonan dinas anggota departemen.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'app-1',
        title: 'Inbox Persetujuan (E-Sign)',
        subtitle: 'Meninjau Permohonan Departemen Anda',
        badge: 'SLIDE 1 · APPROVAL INBOX',
        accentColor: '#f59e0b',
        illustrationType: 'shield',
        uiContextType: 'approver_inbox',
        content: 'Sebagai atasan departemen, Anda memegang tanggung jawab memvalidasi urgensi perjalanan dinas staf Anda.',
        points: [
          'Periksa detail keperluan, rute tujuan, jam dinas, dan daftar anggota tim.',
          'Klik "Setujui (Approve)" untuk membubuhkan E-Sign digital.',
          'Tiket otomatis diteruskan ke antrean Admin Pool GA untuk dijadwalkan.',
        ],
      },
      {
        id: 'app-2',
        title: 'Penolakan / Revisi Permohonan',
        subtitle: 'Menjaga Efisiensi Anggaran & Dinas',
        badge: 'SLIDE 2 · REJECTION',
        accentColor: '#ef4444',
        illustrationType: 'check',
        uiContextType: 'approver_inbox',
        content: 'Jika jadwal berbenturan atau tugas dapat diselesaikan secara online, Anda dapat menolak tiket dengan catatan jelas.',
        points: [
          'Klik tombol "Tolak (Reject)" pada tiket.',
          'Tuliskan alasan penolakan agar pemohon menerima feedback yang jelas.',
        ],
      },
      {
        id: 'app-3',
        title: 'Dashboard Monitoring Armada',
        subtitle: 'Visibilitas Penuh Mobil PT. JAI',
        badge: 'SLIDE 3 · MONITORING',
        accentColor: '#10b981',
        illustrationType: 'car',
        uiContextType: 'admin_timeline',
        content: 'Approver dapat memantau ketersediaan armada seluruh pabrik melalui tab Dashboard Armada.',
        points: [
          'Melihat unit yang sedang beroperasi di luar pabrik.',
          'Melihat jadwal pemakaian kendaraan di hari-hari mendatang.',
        ],
      },
    ],
  },
  approver_pool: {
    role: 'approver_pool',
    title: 'Panduan Persetujuan SPV Kendaraan (Approver Tahap 2)',
    description: 'Panduan validasi kelayakan kendaraan dan personil supir sebelum keberangkatan armada.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'appp-1',
        title: 'Persetujuan Final Penugasan Armada',
        subtitle: 'Inbox Approval SPV Kendaraan (Pool GA)',
        badge: 'SLIDE 1 · FINAL APPROVAL',
        accentColor: '#f97316',
        illustrationType: 'shield',
        uiContextType: 'approver_inbox',
        content: 'SPV Kendaraan bertindak sebagai gerbang otorisasi teknis dan keselamatan armada PT. JAI.',
        points: [
          'Memeriksa kesesuaian unit mobil dan driver yang telah di-assign oleh Admin GA.',
          'Memastikan supir tidak bertugas berturut-turut melebihi batas jam kerja aman.',
          'Klik "Setujui (Approve)": Status trip langsung menjadi READY dan E-Pass diterbitkan.',
        ],
      },
      {
        id: 'appp-2',
        title: 'Penerbitan Izin Jalan (E-Pass)',
        subtitle: 'Kesiapan Check-Out di Pos Security',
        badge: 'SLIDE 2 · E-PASS READY',
        accentColor: '#10b981',
        illustrationType: 'check',
        uiContextType: 'approver_inbox',
        content: 'Setelah disetujui:',
        points: [
          'Jadwal otomatis masuk ke aplikasi supir yang bersangkutan.',
          'Pos security dapat melakukan verifikasi Gate Out saat mobil keluar gerbang pabrik.',
        ],
      },
    ],
  },
  driver: {
    role: 'driver',
    title: 'Panduan Tugas Supir Operasional (Driver)',
    description: 'Panduan bagi 8 supir resmi PT. JAI untuk melihat jadwal dinas, tamu, dan nomor polisi armada.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'drv-1',
        title: 'Memeriksa Jadwal Tugas Driver',
        subtitle: 'Tampilan Mobile-Friendly untuk Smartphone',
        badge: 'SLIDE 1 · DRIVER TASK',
        accentColor: '#3b82f6',
        illustrationType: 'driver',
        uiContextType: 'driver_tasks',
        content: 'Buka sistem JAI-FLEET langsung dari smartphone Anda untuk melihat rincian tugas setiap hari.',
        points: [
          'Nomor polisi dan jenis mobil yang harus disiapkan.',
          'Jam keberangkatan dan estimasi kepulangan.',
          'Nama PIC pemohon, nomor kontak, dan rute tujuan dinas.',
        ],
      },
      {
        id: 'drv-2',
        title: 'Pemeriksaan Unit & Gate Clearance',
        subtitle: 'SOP Keberangkatan di Gerbang Pabrik',
        badge: 'SLIDE 2 · GATE SOP',
        accentColor: '#10b981',
        illustrationType: 'check',
        uiContextType: 'security_gate',
        content: 'Lakukan pengecekan rutin kendaraan (BBM, kebersihan, kartu tol) sebelum berangkat.',
        points: [
          'Hampiri pos security gerbang saat hendak berangkat untuk proses Gate Out.',
          'Saat kembali ke pabrik, pastikan security mencatat Gate In agar tugas tercatat selesai (DONE).',
        ],
      },
    ],
  },
  security: {
    role: 'security',
    title: 'Panduan Pos Keamanan Gerbang (Gate Clearance)',
    description: 'SOP validasi keluar-masuk kendaraan dinas PT. JAI di pos gerbang pabrik.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'sec-1',
        title: 'Validasi Gerbang Keluar (Gate Out)',
        subtitle: 'Pencatatan Keberangkatan Real-Time',
        badge: 'SLIDE 1 · GATE OUT',
        accentColor: '#10b981',
        illustrationType: 'shield',
        uiContextType: 'security_gate',
        content: 'Saat armada dinas hendak keluar gerbang:',
        points: [
          'Buka tab "Gate Out" pada menu Gate Clearance.',
          'Cocokkan nomor plat mobil fisik dengan tiket berstatus READY.',
          'Klik tombol "Keluar Gerbang (Gate Out)" saat mobil melintas gerbang.',
          'Sistem otomatis mencatat jam keluar presisi dan mengubah status menjadi ON_TRIP.',
        ],
      },
      {
        id: 'sec-2',
        title: 'Validasi Gerbang Masuk (Gate In)',
        subtitle: 'Penyelesaian Tugas Kendaraan',
        badge: 'SLIDE 2 · GATE IN',
        accentColor: '#3b82f6',
        illustrationType: 'check',
        uiContextType: 'security_gate',
        content: 'Saat mobil dinas kembali ke pabrik:',
        points: [
          'Buka tab "Gate In".',
          'Klik tombol "Masuk Gerbang (Gate In)".',
          'Status perjalanan resmi selesai (DONE), dan armada kembali tersedia (Tersedia) di pool.',
        ],
      },
    ],
  },
  coupon: {
    role: 'coupon',
    title: 'Panduan Admin Kupon & Keuangan',
    description: 'Verifikasi klaim kupon perjalanan dinas, pembuatan nomor Purchase Requisition (PR), dan pencairan pembayaran.',
    autoPlayInterval: 6,
    slides: [
      {
        id: 'cpn-1',
        title: 'Verifikasi Klaim Kupon Masuk',
        subtitle: 'Tab Pending Claims',
        badge: 'SLIDE 1 · PENDING CLAIMS',
        accentColor: '#a855f7',
        illustrationType: 'ticket',
        uiContextType: 'coupon_claims',
        content: 'Memeriksa tiket perjalanan dinas yang diajukan oleh pemohon untuk kompensasi kupon makan/lembur.',
        points: [
          'Pastikan jam keberangkatan dan durasi dinas memenuhi kriteria tunjangan perusahaan.',
          'Klik Buat PR untuk menerbitkan nomor Purchase Requisition ke bagian keuangan.',
        ],
      },
      {
        id: 'cpn-2',
        title: 'Pencairan Pembayaran (PAID)',
        subtitle: 'Riwayat Pembayaran & Arsip Kupon',
        badge: 'SLIDE 2 · PAYMENT & HISTORY',
        accentColor: '#10b981',
        illustrationType: 'check',
        uiContextType: 'coupon_claims',
        content: 'Setelah dana dicairkan, konfirmasi status klaim menjadi PAID.',
        points: [
          'Klaim yang selesai otomatis berpindah ke tab Riwayat (History).',
          'Dapat diekspor sebagai lampiran pertanggungjawaban kas operasional PT. JAI.',
        ],
      },
    ],
  },
}

export function getAllGuidances(): Record<Role, RoleGuidance> {
  if (typeof window === 'undefined') return DEFAULT_GUIDANCES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GUIDANCES))
      return DEFAULT_GUIDANCES
    }
    const parsed = JSON.parse(raw) as Record<Role, RoleGuidance>
    // Ensure all roles and new slide metadata (like uiContextType) exist
    const merged: Record<Role, RoleGuidance> = { ...DEFAULT_GUIDANCES }
    for (const r of Object.keys(DEFAULT_GUIDANCES) as Role[]) {
      if (parsed[r]) {
        merged[r] = {
          ...DEFAULT_GUIDANCES[r],
          ...parsed[r],
          slides: DEFAULT_GUIDANCES[r].slides.map((defaultSlide, idx) => {
            const savedSlide = parsed[r].slides?.[idx]
            return savedSlide
              ? {
                  ...defaultSlide,
                  ...savedSlide,
                  uiContextType: savedSlide.uiContextType || defaultSlide.uiContextType,
                  imageUrl: savedSlide.imageUrl || defaultSlide.imageUrl,
                }
              : defaultSlide
          }),
        }
      }
    }
    return merged
  } catch {
    return DEFAULT_GUIDANCES
  }
}

export function saveGuidance(role: Role, guidance: RoleGuidance) {
  if (typeof window === 'undefined') return
  try {
    const current = getAllGuidances()
    current[role] = guidance
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    window.dispatchEvent(new Event('guidance_updated'))
  } catch (err) {
    console.error('Failed to save guidance', err)
  }
}

export function resetGuidancesToDefault(): Record<Role, RoleGuidance> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GUIDANCES))
    window.dispatchEvent(new Event('guidance_updated'))
  }
  return DEFAULT_GUIDANCES
}
