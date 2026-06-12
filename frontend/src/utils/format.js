// Formater un montant en Francs Guinéens
export const formatGNF = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' GNF'
}

// Formater un pourcentage
export const formatPercent = (value, total) => {
  if (!total) return '0%'
  return Math.round((value / total) * 100) + '%'
}
