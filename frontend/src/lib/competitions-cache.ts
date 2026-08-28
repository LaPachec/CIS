import { api, unwrapData } from './api'
import type { Competition } from '../types'

let cachedCompetitions: Competition[] | null = null
let pendingCompetitionsRequest: Promise<Competition[]> | null = null

export async function getCachedCompetitions(options?: {
  force?: boolean
}) {
  if (!options?.force && cachedCompetitions) {
    return cachedCompetitions
  }

  if (!options?.force && pendingCompetitionsRequest) {
    return pendingCompetitionsRequest
  }

  pendingCompetitionsRequest = api
    .get<Competition[]>('/competitions')
    .then((response) => {
      const competitions = unwrapData(response)
      cachedCompetitions = competitions
      return competitions
    })
    .finally(() => {
      pendingCompetitionsRequest = null
    })

  return pendingCompetitionsRequest
}

export function setCachedCompetitions(competitions: Competition[]) {
  cachedCompetitions = competitions
}

export function invalidateCompetitionsCache() {
  cachedCompetitions = null
  pendingCompetitionsRequest = null
}
