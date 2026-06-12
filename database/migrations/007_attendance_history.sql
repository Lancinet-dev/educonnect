-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 007 : Historique de présences (30 jours)
--   Donne du contenu au calendrier de présence côté Parent.
--   Concerne les 2 enfants de démo : Abdoulaye (105) et Mariama (106).
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  d   INT;
  jour DATE;
  st  attendance_status;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0000-000000000105'::UUID, '00000000-0000-0000-0000-000000000400'::UUID),
      ('00000000-0000-0000-0000-000000000106'::UUID, '00000000-0000-0000-0000-000000000401'::UUID)
    ) AS t(student_id, class_id)
  LOOP
    FOR d IN 1..29 LOOP
      jour := CURRENT_DATE - d;
      -- Pas d'appel le week-end (samedi=6, dimanche=7 en ISO)
      CONTINUE WHEN EXTRACT(ISODOW FROM jour) IN (6, 7);

      st := CASE
              WHEN d % 11 = 0 THEN 'absent'::attendance_status
              WHEN d % 7  = 0 THEN 'late'::attendance_status
              ELSE 'present'::attendance_status
            END;

      INSERT INTO attendance_records (school_id, student_id, class_id, date, status)
      VALUES ('00000000-0000-0000-0000-000000000010', rec.student_id, rec.class_id, jour, st)
      ON CONFLICT (student_id, date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
