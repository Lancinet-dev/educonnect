-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 004 : 2ᵉ école du réseau + données plateforme
--   • Donne du sens au dashboard Fondateur (comparaison entre écoles)
--   • Enrichit le dashboard Super Admin (plusieurs écoles, plans, croissance)
-- ═══════════════════════════════════════════════════════════════

-- Hash bcrypt valide de « Admin123! »
-- (même mot de passe que les autres comptes de démo)

-- ── 2ᵉ école DANS LE MÊME RÉSEAU que le fondateur (plan GRATUIT) ──
-- Contraste avec le Collège Excellence Conakry (premium)
INSERT INTO schools (id, network_id, name, short_name, type, plan, city, region, created_at) VALUES
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'Groupe Scolaire La Réussite', 'GSR', 'private', 'free', 'Kankan', 'Kankan',
   NOW() - INTERVAL '1 month');

-- Antidater la 1ʳᵉ école pour une courbe de croissance plateforme lisible
UPDATE schools SET created_at = NOW() - INTERVAL '5 months'
  WHERE id = '00000000-0000-0000-0000-000000000010';

-- ── Année scolaire, niveaux & classes de la 2ᵉ école ─────────
INSERT INTO academic_years (id, school_id, label, start_date, end_date, is_current) VALUES
  ('00000000-0000-0000-0000-000000000210',
   '00000000-0000-0000-0000-000000000011',
   '2025-2026', '2025-10-01', '2026-07-31', TRUE);

INSERT INTO levels (id, school_id, name, order_index) VALUES
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000011', 'CP',  1),
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000011', 'CE1', 2);

INSERT INTO classes (id, school_id, level_id, academic_year_id, name, max_students, room) VALUES
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000210', 'CP A',  35, 'Salle 1'),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000210', 'CE1 A', 35, 'Salle 2');

-- ── Enseignants de la 2ᵉ école ───────────────────────────────
INSERT INTO users (id, school_id, role, first_name, last_name, email, password_hash, gender) VALUES
  ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000011',
   'teacher', 'Sékou', 'Condé', 'prof1.gsr@cec.gn',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'M'),
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000011',
   'teacher', 'Mariama', 'Touré', 'prof2.gsr@cec.gn',
   '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi', 'F');

INSERT INTO class_teachers (class_id, teacher_id, is_main) VALUES
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000110', TRUE),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000111', TRUE);

-- ── 15 élèves fictifs de la 2ᵉ école (inscrits CE MOIS) ──────
-- Frais de scolarité plus bas (école au plan gratuit) → recettes < école premium
DO $$
DECLARE
  prenoms TEXT[] := ARRAY['Mamadou','Fatoumata','Ibrahima','Aissatou','Sékou','Mariama','Alpha','Hadja','Ousmane','Kadiatou','Bakary','Djenabou','Lamine','Aminata','Moussa'];
  noms    TEXT[] := ARRAY['Diallo','Camara','Bah','Barry','Conde','Touré','Sow','Keita','Cissé','Kourouma'];
  classes_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000410'::UUID,
    '00000000-0000-0000-0000-000000000411'::UUID
  ];
  i INT;
  uid UUID;
  cid UUID;
BEGIN
  FOR i IN 1..15 LOOP
    uid := uuid_generate_v4();
    cid := classes_ids[1 + (i % 2)];

    INSERT INTO users (id, school_id, role, first_name, last_name, email, password_hash, gender, created_at)
    VALUES (
      uid,
      '00000000-0000-0000-0000-000000000011',
      'student',
      prenoms[1 + (i % array_length(prenoms,1))],
      noms[1 + (i % array_length(noms,1))],
      'eleve.gsr' || i || '@cec.gn',
      '$2b$12$bpIqn.t15NWg9uyW0fuYI.VU/lICR9kLGDUIopQZkthTh7vUrj3xi',
      CASE WHEN i % 2 = 0 THEN 'M'::gender_type ELSE 'F'::gender_type END,
      NOW()   -- inscrits ce mois-ci → comptés dans « nouvelles inscriptions »
    );

    INSERT INTO class_students (class_id, student_id) VALUES (cid, uid);

    -- Facture de scolarité (montant plus bas que l'école premium)
    INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
    VALUES (
      '00000000-0000-0000-0000-000000000011',
      uid,
      '00000000-0000-0000-0000-000000000210',
      'tuition', 'Scolarité annuelle 2025-2026',
      800000,
      CASE WHEN i % 3 = 0 THEN 800000 WHEN i % 3 = 1 THEN 400000 ELSE 0 END,
      '2026-01-31',
      CASE WHEN i % 3 = 0 THEN 'paid'::payment_status
           WHEN i % 3 = 1 THEN 'partial'::payment_status
           ELSE 'pending'::payment_status END
    );
  END LOOP;
END $$;

-- Paiements reçus CE MOIS pour la 2ᵉ école (recettes du mois)
INSERT INTO fee_payments (invoice_id, school_id, amount, method, paid_at)
SELECT id, school_id, amount_paid, 'orange_money', NOW() - (random() * INTERVAL '20 days')
FROM fee_invoices
WHERE school_id = '00000000-0000-0000-0000-000000000011' AND amount_paid > 0;

-- ── Paiements HISTORIQUES (5 mois précédents) pour les 2 écoles ──
-- Donne du contenu à la courbe « recettes consolidées sur 6 mois »
DO $$
DECLARE
  sch UUID;
  inv UUID;
  m   INT;
  base NUMERIC;
BEGIN
  FOREACH sch IN ARRAY ARRAY[
    '00000000-0000-0000-0000-000000000010'::UUID,
    '00000000-0000-0000-0000-000000000011'::UUID
  ] LOOP
    SELECT id INTO inv FROM fee_invoices WHERE school_id = sch LIMIT 1;
    CONTINUE WHEN inv IS NULL;
    base := CASE WHEN sch = '00000000-0000-0000-0000-000000000010'::UUID
                 THEN 8000000 ELSE 2500000 END;
    FOR m IN 1..5 LOOP
      INSERT INTO fee_payments (invoice_id, school_id, amount, method, paid_at)
      VALUES (
        inv, sch,
        (base + random() * 2000000)::numeric(12,2),
        'orange_money',
        date_trunc('month', CURRENT_DATE) - (m || ' months')::interval + INTERVAL '10 days'
      );
    END LOOP;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ÉCOLES SUPPLÉMENTAIRES (autres réseaux) — vue Super Admin
--   Plans variés, une école suspendue, dates étalées sur 6 mois
-- ═══════════════════════════════════════════════════════════════
INSERT INTO school_networks (id, name) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Réseau Éducatif Horizon');

INSERT INTO schools (id, network_id, name, short_name, type, plan, city, region, is_active, created_at) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002',
   'Lycée Horizon Conakry', 'LHC', 'private', 'premium', 'Conakry', 'Conakry', TRUE,  NOW() - INTERVAL '4 months'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002',
   'École Publique de Donka', 'EPD', 'public', 'free', 'Conakry', 'Conakry', TRUE,  NOW() - INTERVAL '3 months'),
  ('00000000-0000-0000-0000-000000000022', NULL,
   'Institut Privé de Labé', 'IPL', 'private', 'premium', 'Labé', 'Labé', FALSE, NOW() - INTERVAL '2 months');
