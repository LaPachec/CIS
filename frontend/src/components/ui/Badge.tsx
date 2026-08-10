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
  default: 'bg-slate-800/80 text-slate-200 ring-slate-600/80',
  objective: 'bg-blue-500/12 text-blue-200 ring-blue-400/35',
  judgement: 'bg-sky-500/12 text-sky-200 ring-sky-400/35',
  success: 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/35',
  warning: 'bg-amber-500/12 text-amber-200 ring-amber-400/35',
  danger: 'bg-red-500/12 text-red-200 ring-red-400/35',
  locked: 'bg-slate-950 text-slate-100 ring-slate-600',
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
