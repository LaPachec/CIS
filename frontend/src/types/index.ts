export type Competition = {
  id: number
  name: string
  location: string | null
  startDate: string
  endDate: string
}

export type Competitor = {
  id: number
  competitionId: number
  name: string
  state: string | null
  workstation: string | null
}

export type ExpertRole = 'EXPERT' | 'SUPERVISOR' | 'ADMIN'

export type Expert = {
  id: number
  competitionId: number
  name: string
  state: string | null
  role: ExpertRole
}

export type Module = {
  id: number
  competitionId: number
  code: string
  name: string
  description: string | null
  totalPoints: string
}

export type Criterion = {
  id: number
  moduleId: number
  code: string
  name: string
  description: string | null
  totalPoints: string
  subCriteria?: SubCriterion[]
}

export type SubCriterion = {
  id: number
  criterionId: number
  code: string
  name: string
  description: string | null
  markingDay: string | null
  markingTeam: string | null
  aspects?: Aspect[]
}

export type AspectType = 'MEASUREMENT' | 'JUDGEMENT'

export type Aspect = {
  id: number
  subCriterionId: number
  code: string
  description: string
  extraDescription: string | null
  requirement: string | null
  type: AspectType
  wsos: string | null
  maxPoints: string
  calculationRule: string | null
  descriptor0: string | null
  descriptor1: string | null
  descriptor2: string | null
  descriptor3: string | null
  marks?: Mark[]
}

export type Mark = {
  id: number
  aspectId: number
  competitorId: number
  expertId: number
  value: string
  observation: string | null
  locked: boolean
  expert?: Expert
}

export type AssessmentModule = Module & {
  criteria: Array<Criterion & {
    subCriteria: Array<SubCriterion & {
      aspects: Aspect[]
    }>
  }>
}

export type CompetitorModuleMarks = {
  competitor: Competitor
  module: AssessmentModule
}
