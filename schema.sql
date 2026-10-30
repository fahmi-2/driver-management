-- ============================================================================
-- SKEMA DATABASE POSTGRESQL: SISTEM MANAJEMEN OPERASIONAL ARMADA & DRIVER
-- PT JAI (YAZAKI GROUP)
-- ============================================================================

-- Ekstensi UUID (opsional, jika ingin ID berbasis uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'requester',
    'approver',
    'approver_manager',
    'approver_pool',
    'admin',
    'admin_lobby',
    'driver',
    'security',
    'coupon'
);

CREATE TYPE trip_category AS ENUM (
    'Dinas',
    'Non-Dinas'
);

CREATE TYPE trip_status AS ENUM (
    'WAITING_SPV',        -- Tahap 1: Menunggu E-Sign SPV Departemen Pemohon
    'WAITING_ASSIGN',     -- Menunggu Pemetaan Armada & Driver oleh Admin Pool GA
    'WAITING_POOL_SPV',   -- Tahap 2: Menunggu E-Sign SPV Kendaraan (Pool GA)
    'READY',              -- Siap Berangkat (Jadwal otomatis masuk ke Driver)
    'ON_TRIP',            -- Armada Keluar Gerbang (Gate Out di-scan Security)
    'DONE',               -- Selesai Tugas (Gate In di-scan Security)
    'REJECTED'            -- Ditolak oleh SPV Dept / SPV Kendaraan
);

CREATE TYPE coupon_status AS ENUM (
    'NONE',               -- Tidak berhak kupon (perjalanan singkat / dalam batas normal)
    'VOID',               -- Hangus (misal trip bertipe driverOnly / tanpa penumpang)
    'CLAIMABLE',          -- Berhak klaim kupon makan/lembur
    'PR_PENDING',         -- Kupon diajukan ke bagian keuangan
    'PR_PROGRESS',        -- PR dalam proses Finance
    'PAID'                -- PR Kupon selesai dibayarkan
);

CREATE TYPE vehicle_category AS ENUM (
    'Mobil Operasional',
    'Mobil Expat',
    'Mobil Sewa'
);

CREATE TYPE vehicle_status AS ENUM (
    'Active',
    'Maintenance'
);

CREATE TYPE driver_shift AS ENUM (
    'Pagi (07:00 - 15:00)',
    'Siang (15:00 - 23:00)',
    'Malam (23:00 - 07:00)',
    'General (08:00 - 17:00)'
);

-- ----------------------------------------------------------------------------
-- 2. TABEL DEPARTEMEN & JABATAN
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. TABEL KENDARAAN (MASTER ARMADA)
-- ----------------------------------------------------------------------------
CREATE TABLE vehicles (
    plate VARCHAR(20) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 7,
    status vehicle_status NOT NULL DEFAULT 'Active',
    category vehicle_category NOT NULL DEFAULT 'Mobil Operasional',
    dedicated_user VARCHAR(150), -- Keterangan pemilik / pengguna khusus (Mobil Expat: Fujiyoshi, Isoda, dll.)
    fuel_efficiency NUMERIC(5, 2) DEFAULT 11.00, -- Rasio efisiensi BBM (km per 1 liter: Avanza 11, Zenix 15, Hybrid 20, Diesel 9)
    fuel_type VARCHAR(50) DEFAULT 'Bensin', -- Jenis bahan bakar: Bensin, Diesel, Hybrid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TABEL DRIVER (MASTER SOPIR)
-- ----------------------------------------------------------------------------
CREATE TABLE drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    sim_type VARCHAR(30) DEFAULT 'SIM A',
    shift VARCHAR(100), -- Opsional, jadwal/jam penugasan dinamis mengikuti admin
    default_plate VARCHAR(20) UNIQUE REFERENCES vehicles(plate) ON DELETE SET NULL, -- 1 driver 1 kendaraan default
    on_leave BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. TABEL PENGGUNA / DATA AKUN (ACCOUNTS)
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    nik VARCHAR(50),
    role user_role NOT NULL,
    dept_id INT REFERENCES departments(id) ON DELETE SET NULL,
    department_name VARCHAR(100),
    section_name VARCHAR(150),
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. TABEL PERJALANAN / TRIP BOOKINGS (FLOW UTAMA SISTEM)
-- ----------------------------------------------------------------------------
CREATE TABLE trips (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    category trip_category NOT NULL DEFAULT 'Dinas',
    purpose TEXT NOT NULL,
    guest VARCHAR(150) NOT NULL,
    
    -- Pemohon (Requester)
    requester_username VARCHAR(50) REFERENCES accounts(username) ON DELETE RESTRICT,
    requester_name VARCHAR(150) NOT NULL,
    requester_nik VARCHAR(50),
    department_name VARCHAR(100) NOT NULL,
    section_name VARCHAR(150),
    
    -- Lokasi & Estimasi
    destination TEXT NOT NULL,
    destinations JSONB, -- Array multi-drop tujuan: ["Tujuan 1", "Tujuan 2"]
    distance_km NUMERIC(6, 2),
    estimated_duration_minutes INT,
    est_departure TIME NOT NULL,
    est_return TIME,
    
    -- Opsi Khusus
    driver_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_other_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
    other_vehicle_name VARCHAR(100),
    blocked_default_plate VARCHAR(20) REFERENCES vehicles(plate) ON DELETE SET NULL,
    blocked_reason TEXT,
    
    -- Penugasan Armada & Supir (oleh Admin GA)
    plate VARCHAR(20) REFERENCES vehicles(plate) ON DELETE SET NULL,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    admin_note TEXT,
    
    -- Approval Tahap 1: SPV / Manager Departemen Pemohon
    spv_name VARCHAR(150),
    spv_email VARCHAR(150),
    approver_email VARCHAR(150),
    spv_at TIMESTAMP WITH TIME ZONE,
    spv_note TEXT,
    
    -- Approval Tahap 2: SPV Kendaraan (Pool GA)
    pool_spv_name VARCHAR(150),
    pool_spv_at TIMESTAMP WITH TIME ZONE,
    pool_spv_note TEXT,
    
    -- Alasan Penolakan (Jika ditolak di tahap 1 / tahap 2)
    reject_reason TEXT,
    
    -- Eksekusi Gerbang (Security Gate Clearance)
    time_go TIMESTAMP WITH TIME ZONE,
    security_go VARCHAR(50) REFERENCES accounts(username) ON DELETE SET NULL,
    time_back TIMESTAMP WITH TIME ZONE,
    security_back VARCHAR(50) REFERENCES accounts(username) ON DELETE SET NULL,
    duration_min INT,
    
    -- Status Perjalanan
    status trip_status NOT NULL DEFAULT 'WAITING_SPV',
    
    -- Manajemen Kupon Makan Lembur / Dinas
    coupon coupon_status NOT NULL DEFAULT 'NONE',
    claimed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by VARCHAR(150),
    pr_number VARCHAR(100),
    pr_created_at TIMESTAMP WITH TIME ZONE,
    pr_created_by VARCHAR(150),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. TABEL PENUMPANG PER TRIP (MULTI-PASSENGER)
-- ----------------------------------------------------------------------------
CREATE TABLE trip_passengers (
    id SERIAL PRIMARY KEY,
    trip_id VARCHAR(50) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    nik VARCHAR(50),
    dept VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. INDEXING UNTUK OPTIMASI PERFORMA QUERY
-- ----------------------------------------------------------------------------
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dept ON trips(department_name);
CREATE INDEX idx_trips_plate ON trips(plate);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_requester ON trips(requester_username);
CREATE INDEX idx_trip_passengers_trip ON trip_passengers(trip_id);
CREATE INDEX idx_accounts_role ON accounts(role);
