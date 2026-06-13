-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 014 : Discipline (incidents) + Surveillant
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE incident_type AS ENUM ('retard', 'comportement', 'tenue', 'absence', 'autre');

CREATE TABLE incidents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  type        incident_type NOT NULL DEFAULT 'autre',
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_incidents_school  ON incidents(school_id, date);
CREATE INDEX idx_incidents_student ON incidents(student_id);

-- ── Compte de démo Surveillant (surveillant@cec.gn / Admin123!) ──
INSERT INTO users (school_id, role, first_name, last_name, email, phone, password_hash, gender)
VALUES ('00000000-0000-0000-0000-000000000010',
        'surveillant', 'Moussa', 'Camara', 'surveillant@cec.gn', '+224 621 000 109',
        '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'M')
ON CONFLICT (email) DO UPDATE
  SET role = 'surveillant', school_id = EXCLUDED.school_id,
      password_hash = EXCLUDED.password_hash, is_active = TRUE;

-- ── Incidents de démo (enfants de démo : Abdoulaye 105, Mariama 106) ──
INSERT INTO incidents (school_id, student_id, class_id, reported_by, type, description, date) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000105',
   '00000000-0000-0000-0000-000000000400', (SELECT id FROM users WHERE email = 'surveillant@cec.gn'),
   'retard', 'Arrivé en retard de 20 minutes au premier cours.', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000105',
   '00000000-0000-0000-0000-000000000400', (SELECT id FROM users WHERE email = 'surveillant@cec.gn'),
   'comportement', 'Bavardages répétés malgré plusieurs rappels.', CURRENT_DATE - 5),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000106',
   '00000000-0000-0000-0000-000000000401', (SELECT id FROM users WHERE email = 'surveillant@cec.gn'),
   'tenue', 'Tenue scolaire non conforme.', CURRENT_DATE - 1);
