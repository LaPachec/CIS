import type { ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'objective'
  | 'judgement'
  | 'success'
  | 'warning'
  | 'danger'
  | 'locked'

type BadgeProps = {
  variant?: BadgeVariant
  children: ReactNode
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] ring-[var(--border)]',
  objective: 'bg-blue-500/12 text-[var(--primary)] ring-blue-400/35',
  judgement: 'bg-sky-500/12 text-sky-400 ring-sky-400/35',
  success: 'bg-emerald-500/15 text-[var(--success)] ring-emerald-500/35',
  warning: 'bg-amber-500/18 text-[var(--warning)] ring-amber-500/40',
  danger: 'bg-red-500/15 text-[var(--danger)] ring-red-500/35',
  locked: 'bg-[var(--surface-strong)] text-[var(--text-primary)] ring-[var(--border-strong)]',
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        variants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
