import { ChevronLeft, ChevronRight } from 'lucide-react'

type SubCriterionNavigatorProps = {
  currentIndex: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

export function SubCriterionNavigator({
  currentIndex,
  total,
  onPrevious,
  onNext,
}: SubCriterionNavigatorProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={currentIndex <= 0}
        onClick={onPrevious}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>

      <span className="text-sm text-slate-500">
        {total === 0 ? '0 de 0' : `${currentIndex + 1} de ${total}`}
      </span>

      <button
        type="button"
        disabled={currentIndex >= total - 1}
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próximo
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
