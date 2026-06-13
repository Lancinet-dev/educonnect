-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 015 : Dépenses (comptabilité)
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE expense_category AS ENUM
  ('salaries', 'supplies', 'maintenance', 'utilities', 'transport', 'other');

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category    expense_category NOT NULL DEFAULT 'other',
  label       VARCHAR(180) NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_expenses_school_date ON expenses(school_id, date);

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Dépenses de démo (CEC) sur les 4 derniers mois ───────────
DO $$
DECLARE
  m INT;
  d DATE;
  rec UUID := (SELECT id FROM users WHERE email = 'comptable@cec.gn');
BEGIN
  FOR m IN 0..3 LOOP
    d := date_trunc('month', CURRENT_DATE) - (m || ' months')::interval + INTERVAL '4 days';
    INSERT INTO expenses (school_id, category, label, amount, date, recorded_by) VALUES
      ('00000000-0000-0000-0000-000000000010', 'salaries',  'Salaires du personnel',        15000000 + (random()*1500000)::int, d, rec),
      ('00000000-0000-0000-0000-000000000010', 'supplies',  'Fournitures scolaires',         1800000 + (random()*600000)::int, d + INTERVAL '6 days', rec),
      ('00000000-0000-0000-0000-000000000010', 'utilities', 'Électricité & eau',             1200000 + (random()*300000)::int, d + INTERVAL '9 days', rec);
    IF m % 2 = 0 THEN
      INSERT INTO expenses (school_id, category, label, amount, date, recorded_by) VALUES
        ('00000000-0000-0000-0000-000000000010', 'maintenance', 'Entretien des locaux', 900000 + (random()*400000)::int, d + INTERVAL '12 days', rec);
    ELSE
      INSERT INTO expenses (school_id, category, label, amount, date, recorded_by) VALUES
        ('00000000-0000-0000-0000-000000000010', 'transport', 'Carburant transport scolaire', 700000 + (random()*300000)::int, d + INTERVAL '12 days', rec);
    END IF;
  END LOOP;
END $$;
