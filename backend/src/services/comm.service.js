import { query } from '../db/pool.js'

// ── Contacts joignables selon le rôle ─────────────────────────
//  parent  → enseignants de ses enfants + direction
//  teacher → parents de ses élèves + direction
//  student → ses enseignants + direction
//  staff   → tout le monde dans l'école
export async function getContacts(user) {
  const { id, role, school_id } = user

  if (['school_admin', 'super_admin', 'accountant', 'founder', 'surveillant'].includes(role)) {
    const { rows } = await query(
      `SELECT id, first_name, last_name, role, avatar_url
       FROM users
       WHERE school_id = $1 AND id <> $2 AND is_active = TRUE
       ORDER BY role, last_name`,
      [school_id, id]
    )
    return rows
  }

  if (role === 'teacher') {
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.avatar_url
       FROM users u
       WHERE u.is_active = TRUE AND u.id <> $1 AND (
         (u.role = 'school_admin' AND u.school_id = $2)
         OR u.id IN (
           SELECT ps.parent_id
           FROM parent_students ps
           JOIN class_students cs ON cs.student_id = ps.student_id
           JOIN class_teachers ct ON ct.class_id = cs.class_id
           WHERE ct.teacher_id = $1
         )
       )
       ORDER BY u.role, u.last_name`,
      [id, school_id]
    )
    return rows
  }

  if (role === 'parent') {
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.avatar_url
       FROM users u
       WHERE u.is_active = TRUE AND u.id <> $1 AND (
         (u.role = 'school_admin' AND u.school_id = $2)
         OR u.id IN (
           SELECT ct.teacher_id
           FROM class_teachers ct
           JOIN class_students cs ON cs.class_id = ct.class_id
           JOIN parent_students ps ON ps.student_id = cs.student_id
           WHERE ps.parent_id = $1
         )
       )
       ORDER BY u.role, u.last_name`,
      [id, school_id]
    )
    return rows
  }

  if (role === 'student') {
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role, u.avatar_url
       FROM users u
       WHERE u.is_active = TRUE AND u.id <> $1 AND (
         (u.role = 'school_admin' AND u.school_id = $2)
         OR u.id IN (
           SELECT ct.teacher_id FROM class_teachers ct
           JOIN class_students cs ON cs.class_id = ct.class_id
           WHERE cs.student_id = $1
         )
       )
       ORDER BY u.role, u.last_name`,
      [id, school_id]
    )
    return rows
  }

  return []
}

// ── Annonces visibles par un utilisateur (avec statut lu) ─────
export async function visibleAnnouncements(user, limit = 50) {
  const { rows } = await query(
    `SELECT a.id, a.title, a.body, a.target, a.target_class_id, a.priority, a.created_at,
            au.first_name AS author_first, au.last_name AS author_last,
            (ar.user_id IS NOT NULL) AS is_read
     FROM announcements a
     LEFT JOIN users au ON au.id = a.author_id
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $1
     WHERE a.school_id = $2 AND (
       $3 = 'school_admin'
       OR a.author_id = $1
       OR a.target = 'school'
       OR (a.target = 'teachers' AND $3 = 'teacher')
       OR (a.target = 'parents'  AND $3 = 'parent')
       OR (a.target = 'students' AND $3 = 'student')
       OR (a.target = 'class' AND (
            $3 IN ('teacher')
            OR ($3 = 'student' AND EXISTS (
                 SELECT 1 FROM class_students cs WHERE cs.class_id = a.target_class_id AND cs.student_id = $1))
            OR ($3 = 'parent' AND EXISTS (
                 SELECT 1 FROM parent_students ps
                 JOIN class_students cs ON cs.student_id = ps.student_id
                 WHERE ps.parent_id = $1 AND cs.class_id = a.target_class_id))
          ))
     )
     ORDER BY
       CASE a.priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
       a.created_at DESC
     LIMIT $4`,
    [user.id, user.school_id, user.role, limit]
  )
  return rows
}

// ── Destinataires d'une annonce (pour notifier en temps réel) ─
export async function getAnnouncementTargetUserIds(announcement) {
  const { school_id, target, target_class_id } = announcement
  let sql, params
  if (target === 'school') {
    sql = `SELECT id FROM users WHERE school_id = $1 AND is_active = TRUE`; params = [school_id]
  } else if (['teachers', 'parents', 'students'].includes(target)) {
    const role = target === 'teachers' ? 'teacher' : target === 'parents' ? 'parent' : 'student'
    sql = `SELECT id FROM users WHERE school_id = $1 AND role = $2 AND is_active = TRUE`; params = [school_id, role]
  } else if (target === 'class') {
    sql = `SELECT cs.student_id AS id FROM class_students cs WHERE cs.class_id = $1
           UNION
           SELECT ps.parent_id AS id FROM parent_students ps
           JOIN class_students cs ON cs.student_id = ps.student_id WHERE cs.class_id = $1`
    params = [target_class_id]
  } else {
    return []
  }
  const { rows } = await query(sql, params)
  return rows.map(r => r.id)
}
