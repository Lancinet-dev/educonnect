-- ═══════════════════════════════════════════════════════════════
-- EduConnect Guinée — Migration 001 : Fondation
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Types ENUM ───────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'super_admin', 'founder', 'school_admin',
  'accountant', 'surveillant', 'teacher', 'student', 'parent'
);
CREATE TYPE school_type  AS ENUM ('public', 'private');
CREATE TYPE plan_type    AS ENUM ('free', 'premium');
CREATE TYPE gender_type  AS ENUM ('M', 'F');

-- ── Réseaux d'écoles ─────────────────────────────────────────
CREATE TABLE school_networks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(150) NOT NULL,
  logo_url   TEXT,
  country    VARCHAR(50) DEFAULT 'Guinée',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Écoles ───────────────────────────────────────────────────
CREATE TABLE schools (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network_id     UUID REFERENCES school_networks(id) ON DELETE SET NULL,
  name           VARCHAR(150) NOT NULL,
  short_name     VARCHAR(30),
  type           school_type NOT NULL DEFAULT 'private',
  plan           plan_type   NOT NULL DEFAULT 'free',
  logo_url       TEXT,
  address        TEXT,
  city           VARCHAR(80),
  region         VARCHAR(80),
  phone          VARCHAR(20),
  email          VARCHAR(120),
  is_active      BOOLEAN DEFAULT TRUE,
  max_classes    INTEGER DEFAULT 3,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Utilisateurs ─────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  role          user_role NOT NULL,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  gender        gender_type,
  birth_date    DATE,
  address       TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Années scolaires ─────────────────────────────────────────
CREATE TABLE academic_years (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label      VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Niveaux ──────────────────────────────────────────────────
CREATE TABLE levels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- ── Classes ──────────────────────────────────────────────────
CREATE TABLE classes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id         UUID REFERENCES levels(id),
  academic_year_id UUID REFERENCES academic_years(id),
  name             VARCHAR(60) NOT NULL,
  max_students     INTEGER DEFAULT 40,
  room             VARCHAR(40),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Enseignant ↔ Classe ──────────────────────────────────────
CREATE TABLE class_teachers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_main    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, teacher_id)
);

-- ── Élève ↔ Classe ───────────────────────────────────────────
CREATE TABLE class_students (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- ── Parent ↔ Élève ───────────────────────────────────────────
CREATE TABLE parent_students (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation   VARCHAR(30) DEFAULT 'parent',
  UNIQUE(parent_id, student_id)
);

-- ── Matières ─────────────────────────────────────────────────
CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,
  short_name  VARCHAR(15),
  coefficient NUMERIC(4,2) DEFAULT 1,
  color       VARCHAR(7) DEFAULT '#6366f1'
);

-- ── Refresh tokens ───────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX idx_users_school  ON users(school_id);
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_role    ON users(role);
CREATE INDEX idx_classes_school ON classes(school_id);

-- ── Trigger updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Données de démo ──────────────────────────────────────────
INSERT INTO school_networks (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Réseau Scolaire Alpha Guinée');

INSERT INTO schools (id, network_id, name, short_name, type, plan, city, region) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Collège Excellence Conakry', 'CEC', 'private', 'premium', 'Conakry', 'Conakry');

-- Mot de passe par défaut : Admin123!
INSERT INTO users (id, school_id, role, first_name, last_name, email, phone, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000100',
   NULL,
   'super_admin', 'Ibrahima', 'Sow',
   'admin@educonnect.gn', '+224 620 000 001',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi'),

  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000010',
   'founder', 'Mamadou', 'Diallo',
   'fondateur@cec.gn', '+224 622 000 002',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi'),

  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000010',
   'school_admin', 'Fatoumata', 'Camara',
   'directrice@cec.gn', '+224 624 000 003',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi'),

  ('00000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000010',
   'teacher', 'Ibrahim', 'Bah',
   'enseignant@cec.gn', '+224 626 000 004',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi'),

  ('00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000010',
   'parent', 'Aissatou', 'Barry',
   'parent@cec.gn', '+224 628 000 005',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi'),

  ('00000000-0000-0000-0000-000000000105',
   '00000000-0000-0000-0000-000000000010',
   'student', 'Abdoulaye', 'Barry',
   'eleve@cec.gn', NULL,
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi');
