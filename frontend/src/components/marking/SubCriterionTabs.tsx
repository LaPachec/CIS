import { CheckCircle2 } from 'lucide-react'
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

          return (
            <button
              key={subCriterion.id}
              type="button"
              onClick={() => onSelect(subCriterion.id)}
              className={[
                'inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : progress === 'complete'
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : progress === 'partial'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {subCriterion.code}
              {progress === 'complete' && <CheckCircle2 size={14} />}
              {progress === 'partial' && <span aria-hidden="true">•</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
