import type { TableHTMLAttributes } from 'react'

export function Table({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/35">
      <table
        className={[
          'w-full text-left text-sm text-slate-200 [&_tbody]:divide-y [&_tbody]:divide-slate-700/70 [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_thead]:border-b [&_thead]:border-slate-700 [&_thead]:bg-slate-950/80 [&_thead]:text-xs [&_thead]:uppercase [&_thead]:text-slate-400',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  )
}
