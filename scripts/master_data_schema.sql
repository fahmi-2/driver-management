-- ============================================================================
-- SKEMA MIGRATION: MASTER DATA DINAMIS (ROLES, DEPARTMENTS, SECTIONS)
-- PT JAI (YAZAKI GROUP)
-- ============================================================================

-- Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL MASTER ROLES
CREATE TABLE IF NOT EXISTS master_roles (
    id VARCHAR(50) PRIMARY KEY, -- kode unik role, misal 'requester', 'approver'
    name VARCHAR(150) NOT NULL, -- Nama label peran (misal 'Requester (Pemohon)')
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL MASTER DEPARTMENTS (DIVISI)
CREATE TABLE IF NOT EXISTS master_departments (
    id VARCHAR(50) PRIMARY KEY, -- UUID atau code misal 'DEP-PGA'
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL MASTER SECTIONS (BAGIAN) DENGAN RELASI FOREIGN KEY KE DEPARTEMEN
CREATE TABLE IF NOT EXISTS master_sections (
    id VARCHAR(50) PRIMARY KEY, -- UUID atau code misal 'SEC-001'
    name VARCHAR(150) NOT NULL,
    department_id VARCHAR(50) NOT NULL REFERENCES master_departments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pencarian
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON master_sections(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_is_deleted ON master_sections(is_deleted);
CREATE INDEX IF NOT EXISTS idx_departments_is_deleted ON master_departments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_roles_is_deleted ON master_roles(is_deleted);

-- Row Level Security (RLS)
ALTER TABLE master_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on master_roles" ON master_roles;
CREATE POLICY "Allow public all access on master_roles" ON master_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on master_departments" ON master_departments;
CREATE POLICY "Allow public all access on master_departments" ON master_departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on master_sections" ON master_sections;
CREATE POLICY "Allow public all access on master_sections" ON master_sections FOR ALL USING (true) WITH CHECK (true);
