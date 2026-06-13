-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 016 : Paramètres plateforme (Super Admin)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE platform_settings (
  key        VARCHAR(50) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prix mensuel de l'abonnement Premium (en GNF) — utilisé pour le MRR
INSERT INTO platform_settings (key, value) VALUES
  ('premium_price', '500000')
ON CONFLICT (key) DO NOTHING;
