-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 008 : Évaluations & Notes
--   • Table evaluations (une évaluation = classe + matière + type + libellé)
--   • grades.evaluation_id relie chaque note à son évaluation
--   • Données de démo : notes pour CM2 A et 6ème A sur 3 matières
-- ═══════════════════════════════════════════════════════════════

-- ── Évaluations ──────────────────────────────────────────────
CREATE TABLE evaluations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES academic_years(id),
  type             VARCHAR(20) NOT NULL DEFAULT 'devoir',  -- devoir | interrogation | composition
  label            VARCHAR(150) NOT NULL,
  coefficient      NUMERIC(4,2) NOT NULL DEFAULT 1,        -- poids de l'évaluation dans la matière
  max_value        NUMERIC(5,2) NOT NULL DEFAULT 20,
  term             VARCHAR(20),
  date             DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_class   ON evaluations(class_id);
CREATE INDEX idx_evaluations_teacher ON evaluations(teacher_id);

CREATE TRIGGER trg_evaluations_updated BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Lien note → évaluation ───────────────────────────────────
ALTER TABLE grades ADD COLUMN evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE;
CREATE INDEX idx_grades_evaluation ON grades(evaluation_id);

-- ── Données de démo : évaluations + notes ────────────────────
-- Pour CM2 A (400) et 6ème A (401), 3 matières, 2 évaluations chacune
-- (un devoir coef 1 + une composition coef 2). Notes pour tous les élèves.
DO $$
DECLARE
  cls UUID;
  subj UUID;
  ev_devoir UUID;
  ev_compo UUID;
  stu RECORD;
  classes UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000400'::UUID,
    '00000000-0000-0000-0000-000000000401'::UUID
  ];
  subjects UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000500'::UUID,  -- Maths
    '00000000-0000-0000-0000-000000000501'::UUID,  -- Français
    '00000000-0000-0000-0000-000000000504'::UUID   -- Anglais
  ];
BEGIN
  FOREACH cls IN ARRAY classes LOOP
    FOREACH subj IN ARRAY subjects LOOP

      -- Devoir (coef 1)
      ev_devoir := uuid_generate_v4();
      INSERT INTO evaluations (id, school_id, class_id, subject_id, teacher_id, academic_year_id, type, label, coefficient, term, date)
      VALUES (ev_devoir, '00000000-0000-0000-0000-000000000010', cls, subj,
              '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000200',
              'devoir', 'Devoir n°1', 1, '1er trimestre', CURRENT_DATE - 20);

      -- Composition (coef 2)
      ev_compo := uuid_generate_v4();
      INSERT INTO evaluations (id, school_id, class_id, subject_id, teacher_id, academic_year_id, type, label, coefficient, term, date)
      VALUES (ev_compo, '00000000-0000-0000-0000-000000000010', cls, subj,
              '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000200',
              'composition', 'Composition 1er trimestre', 2, '1er trimestre', CURRENT_DATE - 5);

      -- Notes de chaque élève de la classe
      FOR stu IN SELECT student_id FROM class_students WHERE class_id = cls LOOP
        INSERT INTO grades (school_id, student_id, subject_id, class_id, academic_year_id, evaluation_id, term, evaluation_type, value, max_value, coefficient, graded_at)
        VALUES ('00000000-0000-0000-0000-000000000010', stu.student_id, subj, cls,
                '00000000-0000-0000-0000-000000000200', ev_devoir, '1er trimestre', 'devoir',
                ROUND((8 + random() * 10)::numeric, 1), 20, 1, CURRENT_DATE - 20);

        INSERT INTO grades (school_id, student_id, subject_id, class_id, academic_year_id, evaluation_id, term, evaluation_type, value, max_value, coefficient, graded_at)
        VALUES ('00000000-0000-0000-0000-000000000010', stu.student_id, subj, cls,
                '00000000-0000-0000-0000-000000000200', ev_compo, '1er trimestre', 'composition',
                ROUND((7 + random() * 12)::numeric, 1), 20, 2, CURRENT_DATE - 5);
      END LOOP;

    END LOOP;
  END LOOP;
END $$;
