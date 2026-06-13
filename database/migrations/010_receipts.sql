-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 010 : Numérotation des reçus de paiement
--   Format : REC-<CODE_ECOLE>-<ANNEE>-<SEQ 4 chiffres>  (ex. REC-CEC-2026-0001)
-- ═══════════════════════════════════════════════════════════════

-- Numéro de reçu unique sur chaque paiement
ALTER TABLE fee_payments ADD COLUMN receipt_number VARCHAR(40) UNIQUE;

-- Compteur séquentiel par école et par année
CREATE TABLE receipt_counters (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year      INT  NOT NULL,
  last_seq  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, year)
);

-- ── Rétro-attribution aux paiements existants ────────────────
WITH numbered AS (
  SELECT p.id,
         p.school_id,
         COALESCE(NULLIF(s.short_name, ''), UPPER(LEFT(s.name, 3))) AS code,
         EXTRACT(YEAR FROM p.paid_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY p.school_id, EXTRACT(YEAR FROM p.paid_at)
           ORDER BY p.paid_at, p.created_at, p.id
         ) AS seq
  FROM fee_payments p
  JOIN schools s ON s.id = p.school_id
)
UPDATE fee_payments fp
SET receipt_number = 'REC-' || n.code || '-' || n.yr || '-' || LPAD(n.seq::text, 4, '0')
FROM numbered n
WHERE n.id = fp.id;

-- ── Initialiser les compteurs au max attribué ────────────────
INSERT INTO receipt_counters (school_id, year, last_seq)
SELECT school_id, EXTRACT(YEAR FROM paid_at)::int, COUNT(*)
FROM fee_payments
GROUP BY school_id, EXTRACT(YEAR FROM paid_at)
ON CONFLICT (school_id, year) DO UPDATE SET last_seq = EXCLUDED.last_seq;
