export const errorHandler = (err, req, res, next) => {
  console.error(`[ERREUR] ${req.method} ${req.path} :`, err.message)

  // Contrainte unique PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Cette valeur existe déjà.' })
  }
  // Clé étrangère manquante
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Référence invalide.' })
  }

  const status = err.status || 500
  res.status(status).json({
    error: status === 500
      ? 'Erreur serveur. Réessayez plus tard.'
      : err.message
  })
}
