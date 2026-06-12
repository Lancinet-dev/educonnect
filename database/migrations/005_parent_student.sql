-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 005 : Notes, Emploi du temps & liens Parent/Élève
--   • Tables grades (vide) et timetable_slots (peuplée)
--   • Lien parent ↔ enfants + 2ᵉ enfant pour tester le sélecteur
-- ═══════════════════════════════════════════════════════════════

-- ── Notes / résultats (laissée VIDE pour l'instant) ──────────
-- Permet aux dashboards d'afficher « Pas encore de notes » sans inventer
-- de fausses valeurs. Le module de saisie des notes viendra plus tard.
CREATE TABLE grades (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id       UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES academic_years(id),
  term             VARCHAR(20),
  evaluation_type  VARCHAR(40),
  value            NUMERIC(5,2) NOT NULL,
  max_value        NUMERIC(5,2) NOT NULL DEFAULT 20,
  coefficient      NUMERIC(4,2) DEFAULT 1,
  graded_at        DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_class   ON grades(class_id);

-- ── Emploi du temps ──────────────────────────────────────────
-- day_of_week : norme ISO (1 = lundi … 7 = dimanche)
CREATE TABLE timetable_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  day_of_week SMALLINT NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  room        VARCHAR(40),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timetable_class_day ON timetable_slots(class_id, day_of_week);

-- ── Matières de l'école de démo (CEC) ────────────────────────
INSERT INTO subjects (id, school_id, name, short_name, coefficient, color) VALUES
  ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000010', 'Mathématiques', 'Maths', 4, '#6366f1'),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000010', 'Français',      'Fr',    4, '#ec4899'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000010', 'Sciences (SVT)','SVT',   2, '#10b981'),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000010', 'Histoire-Géo',  'H-G',   2, '#f59e0b'),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000010', 'Anglais',       'Ang',   2, '#3b82f6');

-- ── 2ᵉ enfant du parent de démo (autre classe : 6ème A) ──────
INSERT INTO users (id, school_id, role, first_name, last_name, email, password_hash, gender, created_at) VALUES
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000010',
   'student', 'Mariama', 'Barry', 'mariama.barry@cec.gn',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'F', NOW());

INSERT INTO class_students (class_id, student_id) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000106')
ON CONFLICT (class_id, student_id) DO NOTHING;

-- ── Lien parent (104) ↔ ses deux enfants (105, 106) ──────────
INSERT INTO parent_students (parent_id, student_id, relation) VALUES
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000105', 'mère'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000106', 'mère')
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- ── Présence du jour des deux enfants ────────────────────────
-- (105 a déjà 'present' via migration 003 ; on garantit 106)
INSERT INTO attendance_records (school_id, student_id, class_id, date, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000106',
   '00000000-0000-0000-0000-000000000401', CURRENT_DATE, 'late')
ON CONFLICT (student_id, date) DO NOTHING;

-- ── Factures de scolarité des deux enfants ───────────────────
INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
SELECT '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000200', 'tuition', 'Scolarité annuelle 2025-2026',
       1500000, 1000000, '2026-01-31', 'partial'
WHERE NOT EXISTS (SELECT 1 FROM fee_invoices WHERE student_id = '00000000-0000-0000-0000-000000000105');

INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
SELECT '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000106',
       '00000000-0000-0000-0000-000000000200', 'tuition', 'Scolarité annuelle 2025-2026',
       1500000, 750000, '2026-01-31', 'partial'
WHERE NOT EXISTS (SELECT 1 FROM fee_invoices WHERE student_id = '00000000-0000-0000-0000-000000000106');

-- Paiements correspondants (pour l'historique côté parent)
INSERT INTO fee_payments (invoice_id, school_id, amount, method, paid_at)
SELECT id, school_id, amount_paid, 'orange_money', NOW() - INTERVAL '5 days'
FROM fee_invoices
WHERE student_id IN ('00000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000106')
  AND amount_paid > 0
  AND NOT EXISTS (SELECT 1 FROM fee_payments p WHERE p.invoice_id = fee_invoices.id);

-- ── Emploi du temps (lundi→vendredi) pour CM2 A et 6ème A ─────
DO $$
DECLARE d INT;
BEGIN
  FOR d IN 1..5 LOOP
    -- CM2 A (classe 400) — classe de l'élève de démo
    INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000400','00000000-0000-0000-0000-000000000500','00000000-0000-0000-0000-000000000103', d, '08:00','09:30','Salle 12'),
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000400','00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000103', d, '09:45','11:15','Salle 12'),
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000400','00000000-0000-0000-0000-000000000502', NULL, d, '11:30','12:30','Salle 12');
    -- 6ème A (classe 401) — classe du 2ᵉ enfant
    INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000501', NULL, d, '08:00','09:30','Salle 8'),
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000503', NULL, d, '09:45','11:15','Salle 8');
  END LOOP;
END $$;
