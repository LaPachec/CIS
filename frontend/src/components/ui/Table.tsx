import type { TableHTMLAttributes } from 'react'

export function Table({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={[
          'w-full text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-slate-100 [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_thead]:border-b [&_thead]:border-slate-200 [&_thead]:bg-slate-50 [&_thead]:text-xs [&_thead]:uppercase [&_thead]:text-slate-500',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  )
}
