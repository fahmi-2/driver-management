-- ============================================================================
-- SINKRONISASI DATABASE: DEPARTMENTS, SECTIONS, DAN ACCOUNTS
-- PT JAI (YAZAKI GROUP)
-- ============================================================================

-- 1. HAPUS TABEL MASTER LAMA JIKA SUDAH PERNAH DIBUAT
DROP TABLE IF EXISTS master_sections CASCADE;
DROP TABLE IF EXISTS master_departments CASCADE;

-- 2. PASTIKAN TABEL DEPARTMENTS MEMILIKI STRUKTUR LENGKAP
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSERT / UPDATE SEMUA DEPARTEMEN KE TABEL departments
INSERT INTO departments (id, name) VALUES
  (1, 'PGA'),
  (2, 'EXPAT'),
  (3, 'Procurement'),
  (4, 'Engineering'),
  (5, 'Production'),
  (6, 'Quality Control'),
  (7, 'HR & GA'),
  (8, 'Finance'),
  (9, 'Maintenance'),
  (10, 'Warehouse'),
  (11, 'PRODUKSI'),
  (12, 'PPIC'),
  (13, 'PP - NYS'),
  (14, 'ME'),
  (15, 'QA'),
  (16, 'FATP-EXIM')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Set sequence jika serial auto increment
SELECT setval(pg_get_serial_sequence('departments', 'id'), (SELECT MAX(id) FROM departments));

-- 4. BUAT TABEL SECTIONS BERELASI KE departments(id)
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department_id INT NOT NULL REFERENCES departments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_section_per_dept UNIQUE (name, department_id)
);

-- 5. INSERT / UPDATE SEMUA SECTION RESMI KE TABEL sections
INSERT INTO sections (id, name, department_id) VALUES
  (1, 'GAGS', 1),
  (2, 'STATIONARY & UTILITY', 1),
  (3, 'INTERPRETER', 1),
  (4, 'HR / IR', 1),
  (5, 'SHE', 1),
  (6, 'PURCHASE', 1),
  (7, 'QSA', 1),
  (8, 'PRODUKSI', 11),
  (9, 'TRAINING', 11),
  (10, 'PPC', 12),
  (11, 'MPC', 12),
  (12, 'WHS', 12),
  (13, 'PP', 13),
  (14, 'NYS', 13),
  (15, 'IT & QC', 13),
  (16, 'DE', 13),
  (17, 'PE', 14),
  (18, 'PD', 14),
  (19, 'MAINTENANCE', 14),
  (20, 'STOCK CONTROL & SPARE PART CONTROL', 14),
  (21, 'QA', 15),
  (22, 'FATP & EXIM', 16)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id;

SELECT setval(pg_get_serial_sequence('sections', 'id'), (SELECT MAX(id) FROM sections));

-- 6. PASTIKAN KOLOM section_name & dept_id PADA TABEL accounts MEMADAI
ALTER TABLE IF EXISTS accounts ALTER COLUMN section_name TYPE TEXT;
ALTER TABLE IF EXISTS accounts ALTER COLUMN department_name TYPE VARCHAR(100);

-- 7. BUAT TABEL RELASI MANY-TO-MANY (account_sections) UNTUK JOIN DINAMIS
CREATE TABLE IF NOT EXISTS account_sections (
    username VARCHAR(50) NOT NULL REFERENCES accounts(username) ON UPDATE CASCADE ON DELETE CASCADE,
    section_id INT NOT NULL REFERENCES sections(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (username, section_id)
);

-- 8. BUAT VIEW VIEW_ACCOUNTS_JOINED UNTUK MELIHAT DATA USER DENGAN JOIN DEPT & SECTION
CREATE OR REPLACE VIEW view_accounts AS
SELECT 
    a.username,
    a.name,
    a.email,
    a.nik,
    a.role,
    a.title,
    a.driver_id,
    a.avatar_url,
    d.id AS dept_id,
    COALESCE(d.name, a.department_name) AS department_name,
    COALESCE(
        string_agg(s.name, ' / ' ORDER BY s.name),
        a.section_name
    ) AS section_name,
    a.created_at,
    a.updated_at
FROM accounts a
LEFT JOIN departments d ON d.id = a.dept_id OR UPPER(d.name) = UPPER(a.department_name)
LEFT JOIN account_sections as_rel ON as_rel.username = a.username
LEFT JOIN sections s ON s.id = as_rel.section_id
GROUP BY a.username, a.name, a.email, a.nik, a.role, a.title, a.driver_id, a.avatar_url, d.id, d.name, a.department_name, a.section_name, a.created_at, a.updated_at;

-- 9. AKTIFKAN RLS DAN AKSES UNTUK departments, sections, account_sections
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on departments" ON departments;
CREATE POLICY "Allow public all access on departments" ON departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on sections" ON sections;
CREATE POLICY "Allow public all access on sections" ON sections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on account_sections" ON account_sections;
CREATE POLICY "Allow public all access on account_sections" ON account_sections FOR ALL USING (true) WITH CHECK (true);

-- 10. INSERT ACCOUNTS DATA LENGKAP DENGAN DEPT_ID TERHUBUNG
INSERT INTO accounts (username, password_hash, name, nik, role, dept_id, department_name, driver_id, title, avatar_url, created_at, updated_at, email, section_name) VALUES
  ('adi.y', 'app123', 'RATNA ADI YUNIAR', null, 'approver', 14, 'ME', null, 'Manager ME', null, '2026-10-12 09:19:22.664223+00', '2026-11-09 11:44:19.057+00', 'adi.y@jai.co.id', 'PE / PD / MAINTENANCE / STOCK CONTROL & SPARE PART CONTROL'),
  ('admin_lobby', 'admin123', 'Admin Lobby Frontdesk', null, 'admin_lobby', 1, 'PGA', null, 'Admin Lobby Frontdesk', null, '2026-10-15 06:20:25.258561+00', '2026-10-15 06:20:25.258561+00', 'admin.lobby@jai.co.id', 'GAGS, STATIONARY & UTILITY, INTERPRETER'),
  ('admin1', 'admin123', 'Admin Pool GA', null, 'admin', 1, 'PGA', null, 'Admin Operasional Pool GA', null, '2026-10-12 08:30:49.37161+00', '2026-10-14 03:56:39.935988+00', 'admin.pool@jai.co.id', 'GAGS, STATIONARY & UTILITY, INTERPRETER'),
  ('agung.i', 'app123', 'AGUNG INDRAYANA', null, 'approver', 1, 'PGA', null, 'SSPV SHE', null, '2026-10-14 03:56:39.935988+00', '2026-11-09 10:12:37.097+00', 'agung.i@jai.co.id', 'SHE'),
  ('ahmad.d', 'user123', 'AHMAD DAROJI', 'JAI-MPC-001', 'requester', 12, 'PPIC', null, 'Admin MPC', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'ic4@jai.co.id', 'MPC'),
  ('anita.k', 'user123', 'ANITA NUR KUMALA', 'JAI-PGA-006', 'requester', 1, 'PGA', null, 'Admin SHE, QSA, Purchase', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'gags6@jai.co.id', 'SHE, QSA, PURCHASE'),
  ('arie.t', 'app123', 'ARIE TRI HERTATI', null, 'approver', 1, 'PGA', null, 'SSPV HR / IR', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'arie.t@jai.co.id', 'HR / IR'),
  ('arvita', 'user123', 'ARVITA', 'JAI-IT-001', 'requester', 13, 'PP - NYS', null, 'Admin IT & QC', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'it2.jai@jai.co.id', 'IT & QC'),
  ('bunga.t', 'user123', 'BUNGA TALENTA', 'JAI-WHS-001', 'requester', 12, 'PPIC', null, 'Admin Warehouse (WHS)', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'bunga.p@jai.co.id', 'WHS'),
  ('danny.h', 'app123', 'DANNY HARLI', null, 'approver', 14, 'ME', null, 'SSPV PE & PD', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'danny.h@jai.co.id', 'PE / PD'),
  ('dedi.k', 'app123', 'DEDI KURNIAWAN PERBAWA', null, 'approver', 12, 'PPIC', null, 'Manager PPIC', null, '2026-10-12 09:19:22.664223+00', '2026-11-09 11:43:42.822+00', 'dedi.k@jai.co.id', 'PPC / MPC / WHS'),
  ('dedy.h', 'app123', 'DEDY HARIAWAN', null, 'approver', 16, 'FATP-EXIM', null, 'Manager FATP-EXIM', null, '2026-10-12 09:19:22.664223+00', '2026-10-14 03:56:39.935988+00', 'dedy.h@jai.co.id', 'FATP & EXIM'),
  ('devi.c', 'user123', 'DEVI CAROLINA', 'JAI-ME-004', 'requester', 14, 'ME', null, 'Admin Maintenance', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'mtc2@jai.co.id', 'MAINTENANCE'),
  ('dewi.p', 'user123', 'DEWI PURNAMA S.', 'JAI-PGA-001', 'requester', 1, 'PGA', null, 'Admin GAGS, Stationary, Utility, Interpreter', null, '2026-10-14 03:56:39.935988+00', '2026-10-29 08:38:54.375+00', 'gags7@jai.co.id', 'GAGS / INTERPRETER / STATIONARY & UTILITY'),
  ('dilla.n', 'user123', 'DILLA NAVI', 'JAI-PGA-004', 'requester', 1, 'PGA', null, 'Admin HR / IR', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'dilla.n@jai.co.id', 'HR / IR'),
  ('dwi.i', 'user123', 'DWI ISMAYA', 'JAI-TRN-001', 'requester', 11, 'PRODUKSI', null, 'Admin Training', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'dwi.i@jai.co.id', 'TRAINING'),
  ('eka.a', 'user123', 'EKA ANGGRAENI', 'JAI-PGA-005', 'requester', 1, 'PGA', null, 'Admin SHE, QSA, Purchase', null, '2026-10-14 03:56:39.935988+00', '2026-10-29 08:39:21.186+00', 'gags3@jai.co.id', 'SHE / PURCHASE / QSA'),
  ('elly', 'user123', 'ELLY', 'JAI-NYS-001', 'requester', 13, 'PP - NYS', null, 'Admin NYS', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'elly.s@jai.co.id', 'NYS'),
  ('elly.suyanti', 'user123', 'ELLY SUYANTI', 'JAI-ME-001', 'requester', 14, 'ME', null, 'Admin PE', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'engprod1@jai.co.id', 'PE'),
  ('endang.s', 'app123', 'ENDANG SRININGSIH', null, 'approver', 11, 'PRODUKSI', null, 'SSPV PRODUKSI', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'endang.s@jai.co.id', 'PRODUKSI'),
  ('evaningsih.m', 'app123', 'EVANINGSIH MUJIASTUTIK', null, 'approver', 12, 'PPIC', null, 'SSPV PPIC (PPC, MPC, WHS)', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'evaningsih@jai.co.id', 'PPC / MPC / WHS'),
  ('evis.m', 'app123', 'EVIS METHAWAN', null, 'approver', 1, 'PGA', null, 'Manager PGA (SHE, QSA, Purchase, intepreter)', null, '2026-10-12 09:19:22.664223+00', '2026-11-09 11:36:24.861+00', 'evis.m@jai.co.id', 'SHE / PURCHASE / QSA / INTERPRETER'),
  ('fajar.y', 'user123', 'FAJAR YULIANI', 'JAI-DE-001', 'requester', 13, 'PP - NYS', null, 'Admin DE', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'yuliani@jai.co.id', 'DE'),
  ('feby', 'user123', 'FEBY', 'JAI-QA-002', 'requester', 15, 'QA', null, 'Admin QA', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'febbi.k@jai.co.id', 'QA'),
  ('fujiyoshi', 'user123', 'FUJIYOSHI', null, 'requester', 1, 'PGA', null, 'Expat User', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('ghofur', 'drv123', 'GHOFUR', null, 'driver', null, null, 'DRV-002', 'Driver Innova Reborn W 1156 QY', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('hayu.p', 'spv123', 'HAYU PRASETYO UTOMO', null, 'approver_pool', 1, 'PGA', null, 'SPV Kendaraan & Pool GA', null, '2026-10-12 08:30:55.255418+00', '2026-10-29 08:30:30.569+00', 'hayu.p@jai.co.id', 'GAGS / INTERPRETER / STATIONARY & UTILITY'),
  ('hendro', 'drv123', 'HENDRO', null, 'driver', null, null, 'DRV-003', 'Driver Innova Reborn W 1460 NE', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('hpu', 'HPU4636', 'Hayu Prasetyo Utomo', '4636', 'approver', 1, 'PGA', null, 'SSPV Gags, Utility Dan Stationary', null, '2026-11-09 12:22:52.4133+00', '2026-11-09 12:22:53.191+00', 'hayu.p@jai.co.id', 'GAGS / STATIONARY & UTILITY'),
  ('ichsan', 'drv123', 'ICHSAN', null, 'driver', null, null, 'DRV-006', 'Driver Avanza L 1508 DBR', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('indra', 'drv123', 'INDRA', null, 'driver', null, null, 'DRV-008', 'Driver Avanza W 1459 NE', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('isoda', 'user123', 'ISODA', null, 'requester', 1, 'PGA', null, 'Expat User', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('jazila', 'user123', 'JAZILA', 'JAI-ME-002', 'requester', 14, 'ME', null, 'Admin PD', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'engprocess1@jai.co.id', 'PD'),
  ('kartika', 'user123', 'KARTIKA', 'JAI-MPC-002', 'requester', 12, 'PPIC', null, 'Admin MPC', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'kartika.m@jai.co.id', 'MPC'),
  ('karyadi', 'drv123', 'KARYADI', null, 'driver', null, null, 'DRV-007', 'Driver Avanza L 1910 DAS', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('kato', 'user123', 'KATO', null, 'requester', 1, 'PGA', null, 'Expat User', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('ketang.p', 'user123', 'KETANG PUJI', 'JAI-PPC-001', 'requester', 12, 'PPIC', null, 'Admin PPC', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'ppc7@jai.co.id', 'PPC'),
  ('kholiq.w', 'app123', 'KHOLIQ IMAM WAHYUDI', null, 'approver', 15, 'QA', null, 'Manager QA', null, '2026-10-12 09:19:22.664223+00', '2026-10-14 03:56:39.935988+00', 'kholiq@jai.co.id', 'QA'),
  ('kupon', 'kupon123', 'Siska Wulandari', null, 'coupon', null, null, null, 'Admin Kupon', null, '2026-10-12 08:31:15.868098+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('laila', 'user123', 'LAILA', 'JAI-PP-001', 'requester', 13, 'PP - NYS', null, 'Admin PP', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'lailatul.k@jai.co.id', 'PP'),
  ('linda.f', 'user123', 'LINDA FURI', 'JAI-WHS-002', 'requester', 12, 'PPIC', null, 'Admin Warehouse (WHS)', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'linda.f@jai.co.id', 'WHS'),
  ('lita.d', 'app123', 'LITA DARMAWANTI', null, 'approver', 13, 'PP - NYS', null, 'SSPV PP', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'lita.d@jai.co.id', 'PP'),
  ('m.chasan', 'app123', 'M. CHASAN BASRI', null, 'approver', 14, 'ME', null, 'SSPV Stock Control, Spare Part, Maintenance', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'm.chasan@jai.co.id', 'STOCK CONTROL & SPARE PART CONTROL / MAINTENANCE'),
  ('ninis', 'user123', 'NINIS', 'JAI-PRD-002', 'requester', 11, 'PRODUKSI', null, 'Admin Produksi', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'nisfiyah.a@jai.co.id', 'PRODUKSI'),
  ('nurwiyanti', 'user123', 'NURWIYANTI', 'JAI-PRD-001', 'requester', 11, 'PRODUKSI', null, 'Admin Produksi', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'nurwiyanti@jai.co.id', 'PRODUKSI'),
  ('richa.f', 'user123', 'RICHA FEBRIANI', 'JAI-PGA-002', 'requester', 1, 'PGA', null, 'Admin GAGS, Stationary, Utility, Interpreter', null, '2026-10-14 03:56:39.935988+00', '2026-10-29 08:39:02.256+00', 'gags4@jai.co.id', 'GAGS / INTERPRETER / STATIONARY & UTILITY'),
  ('rizky.a', 'user123', 'RIZKY AMALIA', 'JAI-PGA-003', 'requester', 1, 'PGA', null, 'Admin HR / IR', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'rizky.a@jai.co.id', 'HR / IR'),
  ('robertus.e', 'app123', 'ROBERTUS EDY P.', null, 'approver', 11, 'PRODUKSI', null, 'Manager PRODUKSI', null, '2026-10-12 09:19:22.664223+00', '2026-11-09 11:51:04.912+00', 'robertus.e@jai.co.id', 'PRODUKSI / TRAINING'),
  ('sahari', 'drv123', 'SAHARI', null, 'driver', null, null, 'DRV-005', 'Driver Avanza W 1458 NE', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('security', 'security123', 'Suradji', null, 'security', null, null, null, 'Security Gerbang', null, '2026-10-12 08:31:15.868098+00', '2026-10-15 07:05:44.809+00', null, null),
  ('siti.n', 'user123', 'SITI NURMUHLISA', 'JAI-TRN-002', 'requester', 11, 'PRODUKSI', null, 'Admin Training', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'sitinurmuhlisa@jai.co.id', 'TRAINING'),
  ('sri.n', 'user123', 'SRI NURMAYANTI', 'JAI-ME-003', 'requester', 14, 'ME', null, 'Admin Stock & Spare Part Control', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'sri.n@jai.co.id', 'STOCK CONTROL & SPARE PART CONTROL'),
  ('tateishi', 'user123', 'TATEISHI', null, 'requester', 1, 'PGA', null, 'Expat User', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('taufik', 'drv123', 'TAUFIK', null, 'driver', null, null, 'DRV-001', 'Driver Innova Zenix W 1318 TI', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('teguh.w', 'app123', 'TEGUH WICAKSONO', null, 'approver', 13, 'PP - NYS', null, 'Manager PP - NYS', null, '2026-10-12 09:19:22.664223+00', '2026-11-09 11:44:00.337+00', 'teguh.w@jai.co.id', 'PP / NYS / IT & QC / DE'),
  ('testing', '123', 'Daniar', '31313', 'requester', 1, 'PGA', null, 'Requester (Pemohon) - Daniar', null, '2026-10-15 08:04:26.254408+00', '2026-10-16 02:49:21.685+00', 'sumarnibabe38@gmail.com', 'GAGS, STATIONARY & UTILITY, INTERPRETER'),
  ('thamrin', 'drv123', 'THAMRIN', null, 'driver', null, null, 'DRV-004', 'Driver Innova Zenix L 1005 DBU', null, '2026-10-12 08:31:08.718384+00', '2026-10-14 03:56:39.935988+00', null, null),
  ('tita.i', 'user123', 'TITA INDAH', 'JAI-QA-001', 'requester', 15, 'QA', null, 'Admin QA', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'qa1@jai.co.id', 'QA'),
  ('toni.w', 'app123', 'TONI WIJAYA', null, 'approver', 15, 'QA', null, 'SSPV QA', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'toni.w@jai.co.id', 'QA'),
  ('umar.f', 'app123', 'UMAR FAHRONI', null, 'approver', 13, 'PP - NYS', null, 'SSPV NYS, DE, IT & QC', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'umar.f@jai.co.id', 'NYS / DE / IT & QC'),
  ('wahyu.m', 'user123', 'WAHYU MENTARI MAYA', 'JAI-FIN-001', 'requester', 16, 'FATP-EXIM', null, 'Admin Finance & Accounting', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'fin.acc@jai.co.id', 'FATP & EXIM'),
  ('wijiati', 'user123', 'WIJIATI', 'JAI-EXIM-001', 'requester', 16, 'FATP-EXIM', null, 'Admin Exim', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'exim7@jai.co.id', 'FATP & EXIM'),
  ('wiwin.w', 'app123', 'WIWIN WINDARWATI', null, 'approver', 11, 'PRODUKSI', null, 'SSPV TRAINING', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'wiwin.w@jai.co.id', 'TRAINING'),
  ('yuli.f', 'app123', 'YULI FIKRIYAH', null, 'approver', 16, 'FATP-EXIM', null, 'SSPV FATP & EXIM', null, '2026-10-14 03:56:39.935988+00', '2026-10-14 03:56:39.935988+00', 'yuli.f@jai.co.id', 'FATP & EXIM')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  nik = EXCLUDED.nik,
  role = EXCLUDED.role,
  dept_id = EXCLUDED.dept_id,
  department_name = EXCLUDED.department_name,
  driver_id = EXCLUDED.driver_id,
  title = EXCLUDED.title,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at,
  email = EXCLUDED.email,
  section_name = EXCLUDED.section_name;

-- 11. HUBUNGKAN AKUN KE SECTIONS (JOIN TABLE account_sections)
INSERT INTO account_sections (username, section_id) VALUES
  ('adi.y', 17),
  ('adi.y', 18),
  ('adi.y', 19),
  ('adi.y', 20),
  ('admin_lobby', 1),
  ('admin_lobby', 2),
  ('admin_lobby', 3),
  ('admin1', 1),
  ('admin1', 2),
  ('admin1', 3),
  ('agung.i', 5),
  ('ahmad.d', 11),
  ('anita.k', 5),
  ('anita.k', 6),
  ('anita.k', 7),
  ('arie.t', 4),
  ('arvita', 15),
  ('bunga.t', 12),
  ('danny.h', 17),
  ('danny.h', 18),
  ('dedi.k', 10),
  ('dedi.k', 11),
  ('dedi.k', 12),
  ('dedy.h', 22),
  ('devi.c', 19),
  ('dewi.p', 1),
  ('dewi.p', 2),
  ('dewi.p', 3),
  ('dilla.n', 4),
  ('dwi.i', 9),
  ('eka.a', 5),
  ('eka.a', 6),
  ('eka.a', 7),
  ('elly', 14),
  ('elly.suyanti', 17),
  ('endang.s', 8),
  ('evaningsih.m', 10),
  ('evaningsih.m', 11),
  ('evaningsih.m', 12),
  ('evis.m', 3),
  ('evis.m', 5),
  ('evis.m', 6),
  ('evis.m', 7),
  ('fajar.y', 16),
  ('feby', 21),
  ('hayu.p', 1),
  ('hayu.p', 2),
  ('hayu.p', 3),
  ('hpu', 1),
  ('hpu', 2),
  ('jazila', 18),
  ('kartika', 11),
  ('ketang.p', 10),
  ('kholiq.w', 21),
  ('laila', 13),
  ('linda.f', 12),
  ('lita.d', 13),
  ('m.chasan', 19),
  ('m.chasan', 20),
  ('ninis', 8),
  ('nurwiyanti', 8),
  ('richa.f', 1),
  ('richa.f', 2),
  ('richa.f', 3),
  ('rizky.a', 4),
  ('robertus.e', 8),
  ('robertus.e', 9),
  ('siti.n', 9),
  ('sri.n', 20),
  ('teguh.w', 13),
  ('teguh.w', 14),
  ('teguh.w', 15),
  ('teguh.w', 16),
  ('testing', 1),
  ('testing', 2),
  ('testing', 3),
  ('tita.i', 21),
  ('toni.w', 21),
  ('umar.f', 14),
  ('umar.f', 15),
  ('umar.f', 16),
  ('wahyu.m', 22),
  ('wijiati', 22),
  ('wiwin.w', 9),
  ('yuli.f', 22)
ON CONFLICT (username, section_id) DO NOTHING;
