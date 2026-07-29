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
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  objective: 'bg-blue-50 text-blue-700 ring-blue-200',
  judgement: 'bg-violet-50 text-violet-700 ring-violet-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  locked: 'bg-slate-800 text-white ring-slate-800',
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ring-1',
        variants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
