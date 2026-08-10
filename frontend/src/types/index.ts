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
  competition?: {
    id: number
    name: string
    location: string | null
  }
}

export type ExpertRole = 'EXPERT' | 'SUPERVISOR' | 'ADMIN' | 'VIEWER'

export type Expert = {
  id: number
  competitionId: number
  name: string
  email: string | null
  state: string | null
  role: ExpertRole
  isActive: boolean
  lastLoginAt?: string | null
  competition?: {
    id: number
    name: string
    location: string | null
  }
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

export type AspectResult = {
  id: number
  code: string
  description: string
  wsos: string | null
  type: AspectType
  maxPoints: number
  markValue: number | null
  score: number
  isMarked: boolean
  marksCount: number
  completedForOfficialResult: boolean
  requiredJudgementMarks?: number
  judgementValues: number[]
  judgementAverage: number | null
  judgementDifference: number | null
  status: 'OK' | 'REVIEW_REQUIRED'
  needsReview: boolean
  marks: Array<{
    id: number
    expertId: number
    expertName: string
    value: number
    observation: string | null
    locked: boolean
  }>
}

export type SubCriterionResult = {
  id: number
  code: string
  name: string
  score: number
  maxPoints: number
  aspects: AspectResult[]
}

export type CriterionResult = {
  id: number
  code: string
  name: string
  score: number
  maxPoints: number
  subCriteria: SubCriterionResult[]
}

export type ModuleResult = {
  module: {
    id: number
    competitionId: number
    code: string
    name: string
    description: string | null
    totalPoints: number
  }
  score: number
  maxPoints: number
  percentage: number
  completedAspects: number
  totalAspects: number
  missingAspects: number
  criteria: CriterionResult[]
}

export type RankingResult = {
  position: number
  competitor: Competitor
  score: number
  maxPoints: number
  percentage: number
  completedAspects: number
  totalAspects: number
  missingAspects: number
  modules: ModuleResult[]
}

export type WsosPerformanceItem = {
  wsos: string
  score: number
  maxPoints: number
  percentage: number
}

export type WsosPerformanceResult = {
  competition: {
    id: number
    name: string
  }
  competitor: {
    id: number
    name: string
    state: string | null
    workstation: string | null
  }
  items: WsosPerformanceItem[]
  summary: {
    score: number
    maxPoints: number
    percentage: number
  }
}

export type CheckSubCriterionStatus =
  | 'EMPTY'
  | 'PARTIAL'
  | 'COMPLETE'
  | 'REVIEW_REQUIRED'
  | 'LOCKED'

export type ModuleCheckResult = {
  competitor: Competitor
  module: {
    id: number
    competitionId: number
    code: string
    name: string
    description: string | null
    totalPoints: string
  }
  summary: {
    totalAspects: number
    markedAspects: number
    missingAspects: number
    lockedMarks: number
    unlockedMarks: number
    judgementAspectsNeedingReview: number
    canLockModule: boolean
  }
  missing: Array<{
    subCriterionCode: string
    aspectCode: string
    description: string
  }>
  needsReview: Array<{
    subCriterionCode: string
    aspectCode: string
    description: string
    values: number[]
    difference: number
  }>
  subCriteria: Array<{
    id: number
    code: string
    name: string
    totalAspects: number
    markedAspects: number
    missingAspects: number
    lockedMarks: number
    unlockedMarks: number
    status: CheckSubCriterionStatus
  }>
}

export type FinalCheckModule = {
  id: number
  code: string
  name: string
  score: number
  maxPoints: number
  percentage: number
  totalAspects: number
  markedAspects: number
  missingAspects: number
  lockedMarks: number
  unlockedMarks: number
  judgementReviewCount: number
  status: CheckSubCriterionStatus
  canLockModule: boolean
}

export type FinalCheckCompetitor = {
  id: number
  name: string
  state: string | null
  workstation: string | null
  summary: {
    score: number
    maxPoints: number
    percentage: number
    completeModules: number
    incompleteModules: number
    lockedModules: number
    missingAspects: number
    judgementReviewCount: number
    status: 'READY' | 'PENDING'
  }
  modules: FinalCheckModule[]
}

export type FinalCheckResult = {
  competition: {
    id: number
    name: string
  }
  summary: {
    competitorsCount: number
    modulesCount: number
    totalExpectedModules: number
    completeModules: number
    incompleteModules: number
    lockedModules: number
    unlockedModules: number
    totalAspects: number
    markedAspects: number
    missingAspects: number
    judgementReviewCount: number
    canCloseCompetition: boolean
  }
  competitors: FinalCheckCompetitor[]
}

export type InconsistencyType =
  | 'MISSING_MARK'
  | 'JUDGEMENT_DIVERGENCE'
  | 'INCOMPLETE_JUDGEMENT'
  | 'UNLOCKED_COMPLETE_MODULE'
  | 'PARTIAL_MODULE'
  | 'EMPTY_MODULE'
  | 'LOCKED_WITH_PENDING'
  | 'MISSING_COMPETITOR_MODULE'
  | 'PERMISSION_OR_DATA_WARNING'

export type InconsistencySeverity = 'critical' | 'warning' | 'info'

export type InconsistencyItem = {
  id: string
  type: InconsistencyType
  severity: InconsistencySeverity
  title: string
  reason: string
  recommendation: string
  competitor: {
    id: number
    name: string
    state: string | null
    workstation: string | null
  }
  module: {
    id: number
    code: string
    name: string
  }
  subCriterion: {
    id: number
    code: string
    name: string
  } | null
  aspect: {
    id: number
    code: string
    description: string
    type: AspectType | string
  } | null
  values: Array<{
    expertId: number
    expertName: string
    value: number
    observation: string | null
    locked: boolean
  }>
  createdAt: string | null
}

export type AdminInconsistenciesResult = {
  competition: {
    id: number
    name: string
  }
  summary: {
    total: number
    critical: number
    warning: number
    info: number
    missingMarks: number
    judgementDivergences: number
    incompleteJudgements: number
    unlockedCompleteModules: number
    emptyModules: number
  }
  items: InconsistencyItem[]
}

export type CollectiveModuleStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'HAS_INCONSISTENCIES'
  | 'READY_TO_LOCK'
  | 'LOCKED'

export type CollectiveModuleInconsistency = {
  type: InconsistencyType
  severity: 'critical' | 'warning'
  subCriterionId: number | null
  subCriterionCode: string | null
  aspectId: number | null
  aspectCode: string | null
  reason: string
}

export type CollectiveModuleStatusItem = {
  id: number
  code: string
  name: string
  totalCompetitors: number
  readyCompetitors: number
  blockedCompetitors: number
  pendingCompetitors: number
  totalAspects: number
  markedAspects: number
  missingAspects: number
  judgementReviewCount: number
  incompleteJudgementCount: number
  unlockedMarks: number
  lockedMarks: number
  status: CollectiveModuleStatus
  canLockCollectively: boolean
}

export type CollectiveModuleClosingResult = {
  competition: {
    id: number
    name: string
  }
  modules: CollectiveModuleStatusItem[]
}

export type CollectiveModuleCompetitor = {
  id: number
  name: string
  state: string | null
  workstation: string | null
  status: CollectiveModuleStatus
  missingAspects: number
  judgementReviewCount: number
  incompleteJudgementCount: number
  lockedMarks: number
  unlockedMarks: number
  markedAspects: number
  totalAspects: number
  canLock: boolean
  inconsistencies: CollectiveModuleInconsistency[]
}

export type CollectiveModuleDetailsResult = {
  module: {
    id: number
    code: string
    name: string
  }
  summary: {
    totalCompetitors: number
    readyCompetitors: number
    pendingCompetitors: number
    canLockCollectively: boolean
  }
  competitors: CollectiveModuleCompetitor[]
}
