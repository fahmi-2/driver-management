-- ============================================================================
-- KONFIGURASI SUPABASE ROW LEVEL SECURITY (RLS)
-- Sistem Manajemen Armada & Driver (gaspoll.cloud)
-- ============================================================================
-- CATATAN:
-- Sistem ini menggunakan custom session internal (disimpan di browser storage),
-- bukan Supabase Auth built-in (auth.users). Oleh karena itu, semua request
-- dari client Next.js dikirim menggunakan Supabase Anon Key (role 'anon').
--
-- Jalankan query di bawah ini pada SQL Editor di Dashboard Supabase Anda:
-- ============================================================================

-- OPSI 1 (DIREKOMENDASIKAN): Berikan akses penuh ke role anon dan authenticated
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trip_passengers ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika sudah pernah dibuat sebelumnya agar tidak error duplikat
DROP POLICY IF EXISTS "Allow public all access on departments" ON departments;
DROP POLICY IF EXISTS "Allow public all access on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow public all access on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow public all access on accounts" ON accounts;
DROP POLICY IF EXISTS "Allow public all access on trips" ON trips;
DROP POLICY IF EXISTS "Allow public all access on trip_passengers" ON trip_passengers;

-- Buat policy izin penuh untuk role anon & authenticated
CREATE POLICY "Allow public all access on departments" 
  ON departments FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public all access on vehicles" 
  ON vehicles FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public all access on drivers" 
  ON drivers FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public all access on accounts" 
  ON accounts FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public all access on trips" 
  ON trips FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public all access on trip_passengers" 
  ON trip_passengers FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- Tabel untuk pengaturan sistem dinamis (seperti konfigurasi SMTP email)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on app_settings" ON app_settings;

CREATE POLICY "Allow public all access on app_settings" 
  ON app_settings FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- ============================================================================
-- OPSI 2 (ALTERNATIF CEPAT): Nonaktifkan RLS sepenuhnya jika tidak diperlukan
-- ============================================================================
-- ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE trip_passengers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
