import FinancialReportView from '@/pages/shared/FinancialReportView'

export default function AccountantReports() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Rapport financier</h1>
        <p className="text-surface-500 mt-1">Recettes, dépenses et solde net mensuel</p>
      </div>
      <FinancialReportView />
    </div>
  )
}
