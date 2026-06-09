import bcrypt from 'bcrypt'
import { query } from '../src/db/pool.js'

const hash = await bcrypt.hash('Admin123!', 12)
console.log('Hash généré :', hash)

const emails = [
  'admin@educonnect.gn',
  'fondateur@cec.gn',
  'directrice@cec.gn',
  'enseignant@cec.gn',
  'parent@cec.gn',
  'eleve@cec.gn',
]

for (const email of emails) {
  await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email])
  console.log(`✅ Mot de passe mis à jour : ${email}`)
}

console.log('\n✅ Tous les comptes de démo utilisent maintenant Admin123!')
process.exit(0)
