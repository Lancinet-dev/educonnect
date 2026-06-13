-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 012 : Devoirs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE homework (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  title          VARCHAR(180) NOT NULL,
  description    TEXT,
  due_date       DATE NOT NULL,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_homework_class ON homework(class_id, due_date);

-- Marque « fait » par élève (présence d'une ligne = devoir terminé)
CREATE TABLE homework_done (
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  done_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (homework_id, student_id)
);

CREATE TRIGGER trg_homework_updated BEFORE UPDATE ON homework
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Données de démo (enseignant 103, classes CM2 A et 6ème A) ─
INSERT INTO homework (school_id, class_id, subject_id, teacher_id, title, description, due_date, created_at) VALUES
  -- CM2 A (400)
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000400',
   '00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000103',
   'Exercices de mathématiques — Chapitre 5',
   'Faire les exercices 1 à 8 page 42. Bien détailler les calculs.',
   CURRENT_DATE - 2, NOW() - INTERVAL '4 days'),

  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000400',
   '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000103',
   'Rédaction — Mes vacances',
   'Rédiger un texte de 15 lignes sur vos dernières vacances.',
   CURRENT_DATE + 3, NOW() - INTERVAL '1 day'),

  -- 6ème A (401)
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000401',
   '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000103',
   'Anglais — Vocabulary Unit 2',
   'Apprendre la liste de vocabulaire de l''unité 2 et faire l''exercice de traduction.',
   CURRENT_DATE - 1, NOW() - INTERVAL '3 days'),

  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000401',
   '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000103',
   'Sciences — Schéma de la cellule',
   'Réaliser un schéma légendé de la cellule végétale.',
   CURRENT_DATE + 5, NOW() - INTERVAL '1 day');
