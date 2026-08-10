import type { SelectHTMLAttributes } from 'react'

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[
        'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]',
        className,
      ].join(' ')}
      {...props}
    />
  )
}
