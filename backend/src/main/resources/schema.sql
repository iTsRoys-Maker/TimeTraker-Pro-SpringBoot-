-- TimeTrack Pro - PostgreSQL schema
-- Ejecutar una sola vez sobre una base limpia:
--   psql -U postgres -d timetrack -f schema.sql

CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    company_id     INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    name           TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'employee'
                   CHECK (role IN ('super_admin','admin','employee')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id               SERIAL PRIMARY KEY,
    company_id       INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_number  TEXT NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    position         TEXT NOT NULL,
    department       TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','inactive')),
    email            TEXT,
    phone            TEXT,
    pin_hash         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK (type IN ('check_in','check_out')),
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_company_time ON attendance_logs (company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_time ON attendance_logs (employee_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS work_schedule (
    id                       SERIAL PRIMARY KEY,
    company_id               INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    start_time               TEXT NOT NULL DEFAULT '08:00',
    end_time                 TEXT NOT NULL DEFAULT '17:00',
    work_days                TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
    late_tolerance_minutes   INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email   TEXT,
    action       TEXT NOT NULL,
    resource     TEXT,
    resource_id  TEXT,
    details      TEXT,
    ip_address   TEXT,
    user_agent   TEXT,
    device       TEXT,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company_time ON audit_logs (company_id, timestamp DESC);
