-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 011 : Frais variés (transport / cantine)
--   Donne du sens à la « répartition des recettes par type » du directeur.
-- ═══════════════════════════════════════════════════════════════

-- Transport (payé) pour les élèves de CM2 A
INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
SELECT '00000000-0000-0000-0000-000000000010', cs.student_id,
       '00000000-0000-0000-0000-000000000200', 'transport', 'Transport scolaire — Trimestre 1',
       300000, 300000, '2026-01-31', 'paid'
FROM class_students cs
WHERE cs.class_id = '00000000-0000-0000-0000-000000000400';

-- Cantine (partiel) pour les élèves de 6ème A
INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, amount_paid, due_date, status)
SELECT '00000000-0000-0000-0000-000000000010', cs.student_id,
       '00000000-0000-0000-0000-000000000200', 'cafeteria', 'Cantine — Trimestre 1',
       200000, 100000, '2026-01-31', 'partial'
FROM class_students cs
WHERE cs.class_id = '00000000-0000-0000-0000-000000000401';

-- Paiements correspondants (montant déjà payé) — reçu attribué ensuite
INSERT INTO fee_payments (invoice_id, school_id, amount, method, paid_at)
SELECT id, school_id, amount_paid, 'cash', NOW() - (random() * INTERVAL '15 days')
FROM fee_invoices
WHERE type IN ('transport', 'cafeteria') AND amount_paid > 0
  AND NOT EXISTS (SELECT 1 FROM fee_payments p WHERE p.invoice_id = fee_invoices.id);

-- Attribution des numéros de reçu aux nouveaux paiements (même logique qu'à l'exécution)
DO $$
DECLARE p RECORD; seq INT; code TEXT;
BEGIN
  FOR p IN
    SELECT fp.id, fp.school_id, EXTRACT(YEAR FROM fp.paid_at)::int AS yr
    FROM fee_payments fp WHERE fp.receipt_number IS NULL
    ORDER BY fp.paid_at, fp.id
  LOOP
    INSERT INTO receipt_counters (school_id, year, last_seq) VALUES (p.school_id, p.yr, 1)
      ON CONFLICT (school_id, year) DO UPDATE SET last_seq = receipt_counters.last_seq + 1
      RETURNING last_seq INTO seq;
    SELECT COALESCE(NULLIF(short_name, ''), UPPER(LEFT(name, 3))) INTO code FROM schools WHERE id = p.school_id;
    UPDATE fee_payments SET receipt_number = 'REC-' || code || '-' || p.yr || '-' || LPAD(seq::text, 4, '0') WHERE id = p.id;
  END LOOP;
END $$;
