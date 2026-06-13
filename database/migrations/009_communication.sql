-- ═══════════════════════════════════════════════════════════════
-- EduConnect — Migration 009 : Communication (Messagerie & Annonces)
-- ═══════════════════════════════════════════════════════════════

-- ── Conversations directes (1:1) ─────────────────────────────
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- ── Annonces ─────────────────────────────────────────────────
CREATE TYPE announcement_target   AS ENUM ('school', 'teachers', 'parents', 'students', 'class');
CREATE TYPE announcement_priority AS ENUM ('normal', 'important', 'urgent');

CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  title           VARCHAR(180) NOT NULL,
  body            TEXT NOT NULL,
  target          announcement_target   NOT NULL DEFAULT 'school',
  target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  priority        announcement_priority NOT NULL DEFAULT 'normal',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_announcements_school ON announcements(school_id, created_at);

CREATE TABLE announcement_reads (
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMO
-- ═══════════════════════════════════════════════════════════════

-- ── Annonces de la directrice (102) ──────────────────────────
INSERT INTO announcements (id, school_id, author_id, title, body, target, priority, created_at) VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000102',
   'Fermeture exceptionnelle vendredi',
   'En raison de travaux de maintenance, l''école sera fermée ce vendredi. Les cours reprendront lundi normalement.',
   'school', 'urgent', NOW() - INTERVAL '2 hours'),

  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000102',
   'Réunion parents-professeurs',
   'Une réunion parents-professeurs aura lieu samedi à 9h dans la salle polyvalente. Votre présence est vivement souhaitée.',
   'parents', 'important', NOW() - INTERVAL '1 day'),

  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000102',
   'Concours de lecture',
   'Un concours de lecture est organisé pour les élèves. Inscriptions ouvertes auprès de votre enseignant.',
   'students', 'normal', NOW() - INTERVAL '3 days');

-- ── Conversation de démo : enseignant (103) ↔ parent (104) ───
INSERT INTO conversations (id, school_id, last_message_at) VALUES
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '1 hour');

INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000103', NOW()),
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000104', NOW() - INTERVAL '2 hours');

INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000103',
   'Bonjour Mme Barry, je tenais à vous féliciter pour les progrès d''Abdoulaye en mathématiques.', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000104',
   'Bonjour M. Bah, merci beaucoup ! Nous travaillons les exercices à la maison.', NOW() - INTERVAL '1 hour 50 minutes'),
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000103',
   'C''est parfait. N''hésitez pas si vous avez la moindre question.', NOW() - INTERVAL '1 hour');
