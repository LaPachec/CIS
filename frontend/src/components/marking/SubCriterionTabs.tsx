import { CheckCircle2, Circle, TriangleAlert } from 'lucide-react'
import type { FlatSubCriterion, ProgressStatus } from './marking-utils'

type SubCriterionTabsProps = {
  subCriteria: FlatSubCriterion[]
  activeId: number | null
  getProgress: (subCriterion: FlatSubCriterion) => ProgressStatus
  onSelect: (id: number) => void
}

export function SubCriterionTabs({
  subCriteria,
  activeId,
  getProgress,
  onSelect,
}: SubCriterionTabsProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {subCriteria.map((subCriterion) => {
          const progress = getProgress(subCriterion)
          const active = subCriterion.id === activeId
          const status = getStatusConfig(progress)
          const Icon = status.icon

          return (
            <button
              key={subCriterion.id}
              type="button"
              onClick={() => onSelect(subCriterion.id)}
              className={[
                'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : status.className,
              ].join(' ')}
              title={`${subCriterion.code} - ${status.label}`}
            >
              {subCriterion.code}
              <span className="inline-flex items-center gap-1 text-xs font-medium">
                <Icon size={13} />
                {status.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getStatusConfig(progress: ProgressStatus) {
  if (progress === 'complete') {
    return {
      label: 'Completo',
      icon: CheckCircle2,
      className: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    }
  }

  if (progress === 'partial') {
    return {
      label: 'Parcial',
      icon: TriangleAlert,
      className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    }
  }

  return {
    label: 'Não Iniciado',
    icon: Circle,
    className: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  }
}
