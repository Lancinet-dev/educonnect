-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Réinitialisation des données de démonstration
-- ═══════════════════════════════════════════════════════════════
--
--  ⚠️  SCRIPT MANUEL — NE PAS placer dans database/migrations/ et NE PAS
--      lancer automatiquement. À exécuter uniquement quand on est prêt à
--      arrêter les tests et passer en "production légère".
--
--  Effet :
--    • Supprime TOUTES les écoles de démo et, EN CASCADE, toutes leurs
--      données liées (utilisateurs rattachés, classes, notes, présences,
--      paiements, messages, devoirs, emploi du temps, etc.).
--    • Supprime aussi les réseaux d'écoles de démo et les conversations
--      n'impliquant plus aucun utilisateur.
--    • CONSERVE uniquement le compte super_admin (admin@educonnect.gn),
--      qui n'est rattaché à aucune école (school_id NULL).
--
--  Comment lancer (depuis le dossier backend) :
--    node -e "import('dotenv/config').then(async()=>{const{pool}=await import('./src/db/pool.js');const fs=await import('fs');await pool.query(fs.readFileSync('../database/seed-reset.sql','utf8'));console.log('✅ Données de démo supprimées');process.exit(0)})"
--  ou via psql :
--    psql "$DATABASE_URL" -f database/seed-reset.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Supprimer toutes les écoles → cascade sur users(school_id), classes,
--    grades, attendance, fee_*, homework, timetable_slots, announcements…
DELETE FROM schools;

-- 2. Supprimer les réseaux d'écoles (plus aucune école rattachée)
DELETE FROM school_networks;

-- 3. Filet de sécurité : supprimer tout utilisateur restant qui n'est PAS
--    le super_admin (ex. comptes sans school_id créés pendant les tests).
DELETE FROM users WHERE role <> 'super_admin';

-- 4. Nettoyer les conversations devenues orphelines (aucun participant)
DELETE FROM conversations c
WHERE NOT EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id);

COMMIT;

-- Vérification (à exécuter après) :
--   SELECT email, role FROM users;            -- doit ne lister que admin@educonnect.gn
--   SELECT COUNT(*) FROM schools;             -- doit valoir 0
