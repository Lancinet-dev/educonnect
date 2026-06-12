-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 006 : Compte comptable & affectations prof
--   • Crée le compte de démo comptable@cec.gn
--   • Affecte l'enseignant de démo à plusieurs classes
-- ═══════════════════════════════════════════════════════════════

-- ── Compte comptable de démo (école CEC) ─────────────────────
INSERT INTO users (id, school_id, role, first_name, last_name, email, phone, password_hash, gender) VALUES
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000010',
   'accountant', 'Mamadou', 'Sylla', 'comptable@cec.gn', '+224 621 000 007',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'M')
ON CONFLICT (id) DO NOTHING;

-- Présence du personnel aujourd'hui (comptable présent)
INSERT INTO staff_attendance (school_id, staff_id, date, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000107', CURRENT_DATE, 'present')
ON CONFLICT (staff_id, date) DO NOTHING;

-- ── Affecter l'enseignant de démo (103) à 2 classes de plus ──
-- Il était professeur principal de CM2 A ; il intervient aussi en 6ème A et 3ème B
INSERT INTO class_teachers (class_id, teacher_id, is_main) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000103', FALSE),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000103', FALSE)
ON CONFLICT (class_id, teacher_id) DO NOTHING;

-- Quelques créneaux d'emploi du temps de l'enseignant en 6ème A et 3ème B
DO $$
DECLARE d INT;
BEGIN
  FOR d IN 1..5 LOOP
    INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000500','00000000-0000-0000-0000-000000000103', d, '13:30','15:00','Salle 8'),
      ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000500','00000000-0000-0000-0000-000000000103', d, '15:15','16:45','Salle 3');
  END LOOP;
END $$;
