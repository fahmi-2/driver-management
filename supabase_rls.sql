-- JALANKAN QUERY INI DI SQL EDITOR SUPABASE UNTUK MENGIZINKAN AKSES API ANON
-- (Karena autentikasi sistem ini menggunakan custom session internal)

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;

-- Izinkan Full Access (SELECT, INSERT, UPDATE, DELETE) untuk public role (anon)
CREATE POLICY "Allow public all access on departments" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on trip_passengers" ON trip_passengers FOR ALL USING (true) WITH CHECK (true);
