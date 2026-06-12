-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 003 : Présences & Finances (base)
-- ═══════════════════════════════════════════════════════════════

-- ── Statuts de présence ──────────────────────────────────────
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- ── Présences élèves ─────────────────────────────────────────
CREATE TABLE attendance_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      attendance_status NOT NULL DEFAULT 'present',
  recorded_by UUID REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_school_date ON attendance_records(school_id, date);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);

-- ── Présences personnel ──────────────────────────────────────
CREATE TABLE staff_attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      attendance_status NOT NULL DEFAULT 'present',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE INDEX idx_staff_attendance_school_date ON staff_attendance(school_id, date);

-- ── Types de frais ───────────────────────────────────────────
CREATE TYPE fee_type AS ENUM ('tuition', 'transport', 'cafeteria', 'uniform', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'orange_money', 'mtn_money', 'bank', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

-- ── Frais scolaires attendus par élève ──────────────────────
CREATE TABLE fee_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  type            fee_type NOT NULL DEFAULT 'tuition',
  label           VARCHAR(150) NOT NULL,
  amount_due      NUMERIC(12,2) NOT NULL,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date        DATE,
  status          payment_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_invoices_school ON fee_invoices(school_id);
CREATE INDEX idx_fee_invoices_student ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(status);

-- ── Paiements reçus ──────────────────────────────────────────
CREATE TABLE fee_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  method      payment_method NOT NULL DEFAULT 'cash',
  reference   VARCHAR(100),
  received_by UUID REFERENCES users(id),
  paid_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_payments_school_date ON fee_payments(school_id, paid_at);

-- Trigger updated_at
CREATE TRIGGER trg_fee_invoices_updated BEFORE UPDATE ON fee_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMO — pour que le dashboard directeur ait du contenu
-- ═══════════════════════════════════════════════════════════════

-- Année scolaire courante
INSERT INTO academic_years (id, school_id, label, start_date, end_date, is_current) VALUES
  ('00000000-0000-0000-0000-000000000200',
   '00000000-0000-0000-0000-000000000010',
   '2025-2026', '2025-10-01', '2026-07-31', TRUE);

-- Niveaux
INSERT INTO levels (id, school_id, name, order_index) VALUES
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000010', 'CM2', 1),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000010', '6ème', 2),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000010', '3ème', 3);

-- Classes
INSERT INTO classes (id, school_id, level_id, academic_year_id, name, max_students, room) VALUES
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000200', 'CM2 A', 40, 'Salle 12'),
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000200', '6ème A', 45, 'Salle 8'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000200', '3ème B', 38, 'Salle 3');

-- Affecter l'enseignant de démo comme prof principal de CM2 A
INSERT INTO class_teachers (class_id, teacher_id, is_main) VALUES
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000103', TRUE);

-- Affecter l'élève de démo à CM2 A
INSERT INTO class_students (class_id, student_id) VALUES
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000105');

-- Générer 25 élèves fictifs supplémentaires répartis dans les 3 classes
DO $$
DECLARE
  prenoms TEXT[] := ARRAY['Mamadou','Fatoumata','Ibrahima','Aissatou','Sékou','Mariama','Alpha','Hadja','Ousmane','Kadiatou','Bakary','Djenabou','Lamine','Aminata','Moussa','Fanta','Karim','Sira','Yaya','Nènè','Mohamed','Hawa','Sidiki','Mabinty','Thierno'];
  noms    TEXT[] := ARRAY['Diallo','Camara','Bah','Barry','Conde','Touré','Sow','Keita','Cissé','Doumbouya','Kourouma','Soumah','Fofana','Diakité','Sylla'];
  classes_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000400'::UUID,
    '00000000-0000-0000-0000-000000000401'::UUID,
    '00000000-0000-0000-0000-000000000402'::UUID
  ];
  i INT;
  uid UUID;
  cid UUID;
BEGIN
  FOR i IN 1..25 LOOP
    uid := uuid_generate_v4();
    cid := classes_ids[1 + (i % 3)];

    INSERT INTO users (id, school_id, role, first_name, last_name, email, password_hash, gender)
    VALUES (
      uid,
      '00000000-0000-0000-0000-000000000010',
      'student',
      prenoms[1 + (i % array_length(prenoms,1))],
      noms[1 + (i % array_length(noms,1))],
      'eleve' || i || '@cec.gn',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniLeSmUOVhLXeGxIkFfL7lQ8S',
      CASE WHEN i % 2 = 0 THEN 'M'::gender_type ELSE 'F'::gender_type END
    );

    INSERT INTO class_students (class_id, student_id) VALUES (cid, uid);

    -- Présence du jour : 90% présents, 10% absents/retards
    INSERT INTO attendance_records (school_id, student_id, class_id, date, status)
    VALUES (
      '00000000-0000-0000-0000-000000000010',
      uid, cid, CURRENT_DATE,
      CASE WHEN i % 10 = 0 THEN 'absent'::attendance_status
           WHEN i % 7 = 0 THEN 'late'::attendance_status
           ELSE 'present'::attendance_status END
    );

    -- Facture de scolarité pour chaque élève
    INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
    VALUES (
      '00000000-0000-0000-0000-000000000010',
      uid,
      '00000000-0000-0000-0000-000000000200',
      'tuition', 'Scolarité annuelle 2025-2026',
      1500000,
      CASE WHEN i % 3 = 0 THEN 1500000 WHEN i % 3 = 1 THEN 750000 ELSE 0 END,
      '2026-01-31',
      CASE WHEN i % 3 = 0 THEN 'paid'::payment_status
           WHEN i % 3 = 1 THEN 'partial'::payment_status
           ELSE 'pending'::payment_status END
    );
  END LOOP;
END $$;

-- Présence du jour pour l'élève principal de démo et le personnel
INSERT INTO attendance_records (school_id, student_id, class_id, date, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000105',
   '00000000-0000-0000-0000-000000000400', CURRENT_DATE, 'present');

INSERT INTO staff_attendance (school_id, staff_id, date, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000103', CURRENT_DATE, 'present'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000102', CURRENT_DATE, 'present');

-- Quelques paiements reçus ce mois pour les recettes du dashboard
INSERT INTO fee_payments (invoice_id, school_id, amount, method, received_by, paid_at)
SELECT id, school_id, amount_paid, 'orange_money', '00000000-0000-0000-0000-000000000102', NOW() - (random() * INTERVAL '20 days')
FROM fee_invoices WHERE amount_paid > 0;
