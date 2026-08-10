import type { TableHTMLAttributes } from 'react'

export function Table({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="scroll-area overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <table
        className={[
          'w-full text-left text-sm text-[var(--text-secondary)] [&_tbody]:divide-y [&_tbody]:divide-[var(--border)] [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_thead]:border-b [&_thead]:border-[var(--border)] [&_thead]:bg-[var(--surface-muted)] [&_thead]:text-xs [&_thead]:uppercase [&_thead]:text-[var(--text-muted)]',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  )
}
