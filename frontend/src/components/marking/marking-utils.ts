import type { Aspect, CompetitorModuleMarks, Criterion, Mark, SubCriterion } from '../../types'

export const currentExpertId = 1

export type FlatSubCriterion = SubCriterion & {
  criterion: Criterion
  aspects: Aspect[]
}

export type ProgressStatus = 'empty' | 'partial' | 'complete'

export type SaveStatusValue = 'idle' | 'saving' | 'saved' | 'error'

export function flattenSubCriteria(data: CompetitorModuleMarks): FlatSubCriterion[] {
  return data.module.criteria
    .flatMap((criterion) =>
      criterion.subCriteria.map((subCriterion) => ({
        ...subCriterion,
        criterion,
        aspects: subCriterion.aspects ?? [],
      })),
    )
    .sort(sortSubCriteriaByCode)
}

export function sortSubCriteriaByCode(a: Pick<SubCriterion, 'code'>, b: Pick<SubCriterion, 'code'>) {
  return a.code.localeCompare(b.code, 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  })
}

export function findExistingMark(aspect: Aspect, expertId = currentExpertId) {
  return aspect.marks?.find((mark) => mark.expertId === expertId)
}

export function hasValidMarkId(mark: Mark | undefined) {
  return typeof mark?.id === 'number' && Number.isFinite(mark.id) && mark.id > 0
}

export function getSubCriterionProgress(subCriterion: FlatSubCriterion): ProgressStatus {
  if (subCriterion.aspects.length === 0) {
    return 'empty'
  }

  const markedAspects = subCriterion.aspects.filter((aspect) =>
    Boolean(findExistingMark(aspect)),
  ).length

  if (markedAspects === 0) {
    return 'empty'
  }

  if (markedAspects === subCriterion.aspects.length) {
    return 'complete'
  }

  return 'partial'
}

export function calculateSubCriterionMaxPoints(subCriterion: FlatSubCriterion) {
  return subCriterion.aspects.reduce(
    (total, aspect) => total + Number(aspect.maxPoints),
    0,
  )
}

export function calculateSubCriterionCurrentPoints(subCriterion: FlatSubCriterion) {
  return subCriterion.aspects.reduce((total, aspect) => {
    const mark = findExistingMark(aspect)

    if (!mark) {
      return total
    }

    const value = Number(mark.value)
    const maxPoints = Number(aspect.maxPoints)

    if (aspect.type === 'JUDGEMENT') {
      return total + (value / 3) * maxPoints
    }

    return total + value
  }, 0)
}

export function getDefaultValueForAspect() {
  return 0
}

export function updateAspectMark(
  data: CompetitorModuleMarks,
  aspectId: number,
  nextMark: Mark,
): CompetitorModuleMarks {
  return {
    ...data,
    module: {
      ...data.module,
      criteria: data.module.criteria.map((criterion) => ({
        ...criterion,
        subCriteria: criterion.subCriteria.map((subCriterion) => ({
          ...subCriterion,
          aspects: (subCriterion.aspects ?? []).map((aspect) => {
            if (aspect.id !== aspectId) {
              return aspect
            }

            const otherMarks = (aspect.marks ?? []).filter(
              (mark) => mark.expertId !== nextMark.expertId,
            )

            return {
              ...aspect,
              marks: [...otherMarks, nextMark],
            }
          }),
        })),
      })),
    },
  }
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value)
}
