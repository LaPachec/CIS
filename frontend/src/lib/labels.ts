import type { AspectType, ExpertRole } from '../types'

export function translateAspectType(type?: AspectType | string | null) {
  const labels: Record<string, string> = {
    MEASUREMENT: 'Objetivo',
    JUDGEMENT: 'Julgamento',
    JUDGMENT: 'Julgamento',
  }

  return type ? labels[type] ?? type : '-'
}

export function translateRole(role?: ExpertRole | string | null) {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    SUPERVISOR: 'Supervisor',
    EXPERT: 'Avaliador',
    VIEWER: 'Visualizador',
  }

  return role ? labels[role] ?? role : '-'
}

export function translateStatus(status?: string | null) {
  const labels: Record<string, string> = {
    EMPTY: 'Não Iniciado',
    PARTIAL: 'Parcial',
    COMPLETE: 'Completo',
    REVIEW_REQUIRED: 'Revisão Necessária',
    LOCKED: 'Bloqueado',
    UNLOCKED: 'Desbloqueado',
    PENDING: 'Pendente',
    CLOSED: 'Fechado',
    READY: 'Pronto',
    OK: 'OK',
  }

  return status ? labels[status] ?? status : '-'
}

export function formatTitle(text: string) {
  const smallWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para'])

  return text
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) =>
      index > 0 && smallWords.has(word)
        ? word
        : `${word.charAt(0).toLocaleUpperCase('pt-BR')}${word.slice(1)}`,
    )
    .join(' ')
}
