import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border border-blue-400/30 bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_14px_34px_rgba(37,99,235,0.28)] hover:bg-blue-500',
  secondary: 'border border-slate-600 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800',
  danger: 'border border-red-400/30 bg-red-600 text-white hover:bg-red-500',
  success: 'border border-emerald-400/30 bg-emerald-600 text-white hover:bg-emerald-500',
  ghost: 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
