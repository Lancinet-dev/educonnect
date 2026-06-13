-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 013 : Emploi du temps complet (démo)
--   Reconstruit un emploi du temps hebdomadaire cohérent et SANS
--   conflit d'enseignant pour CM2 A (400), 6ème A (401), 3ème B (402).
-- ═══════════════════════════════════════════════════════════════

-- 2ᵉ enseignant de l'école CEC (pour varier les emplois du temps)
INSERT INTO users (id, school_id, role, first_name, last_name, email, password_hash, gender) VALUES
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000010',
   'teacher', 'Aminata', 'Diallo', 'prof2.cec@cec.gn',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'F')
ON CONFLICT (id) DO NOTHING;

-- La nouvelle enseignante intervient aussi en 6ème A
INSERT INTO class_teachers (class_id, teacher_id, is_main) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000108', FALSE)
ON CONFLICT (class_id, teacher_id) DO NOTHING;

-- ── Reconstruction de l'emploi du temps ──────────────────────
DO $$
DECLARE
  classes  UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000400'::uuid,
    '00000000-0000-0000-0000-000000000401'::uuid,
    '00000000-0000-0000-0000-000000000402'::uuid];
  subjects UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000500'::uuid,  -- Maths
    '00000000-0000-0000-0000-000000000501'::uuid,  -- Français
    '00000000-0000-0000-0000-000000000502'::uuid,  -- SVT
    '00000000-0000-0000-0000-000000000503'::uuid,  -- Histoire-Géo
    '00000000-0000-0000-0000-000000000504'::uuid]; -- Anglais
  teachers UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000108'::uuid,
    NULL]::uuid[];
  starts TIME[] := ARRAY['08:00','09:00','10:15','11:15','14:00','15:00']::time[];
  ends   TIME[] := ARRAY['09:00','10:00','11:15','12:15','15:00','16:00']::time[];
  rooms  TEXT[] := ARRAY['Salle 12','Salle 8','Salle 3'];
  d INT; t INT; c INT; nslots INT;
BEGIN
  DELETE FROM timetable_slots WHERE class_id = ANY(classes);

  FOR d IN 1..6 LOOP                       -- lundi(1) → samedi(6)
    nslots := CASE WHEN d = 6 THEN 3 ELSE 6 END;   -- samedi : matinée seulement
    FOR t IN 0..(nslots - 1) LOOP
      FOR c IN 0..2 LOOP
        INSERT INTO timetable_slots
          (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
        VALUES (
          '00000000-0000-0000-0000-000000000010',
          classes[c + 1],
          subjects[1 + ((t + c + d) % 5)],
          teachers[1 + ((c + t) % 3)],     -- unicité du prof par (jour, créneau)
          d,
          starts[t + 1],
          ends[t + 1],
          rooms[c + 1]
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
