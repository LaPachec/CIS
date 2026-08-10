import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border border-blue-400/30 bg-[var(--primary)] text-white shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_14px_34px_rgba(37,99,235,0.24)] hover:bg-[var(--primary-hover)]',
  secondary: 'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]',
  danger: 'border border-red-400/40 bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)]',
  success: 'border border-emerald-400/40 bg-[var(--success)] text-white hover:bg-[var(--success-hover)]',
  warning: 'border border-amber-400/50 bg-[var(--warning)] text-slate-950 hover:bg-[var(--warning-hover)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]',
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
