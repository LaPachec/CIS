import { Moon, Sun } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTheme } from '../contexts/useTheme'

type ThemeToggleProps = {
  fixed?: boolean
}

export function ThemeToggle({ fixed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'

  const button = (
    <button
      type="button"
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      onClick={toggleTheme}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[0_12px_32px_rgba(15,23,42,0.16)] backdrop-blur hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
        fixed ? 'fixed right-3 top-3 z-[9999] sm:right-4 sm:top-4' : '',
      ].join(' ')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )

  if (fixed && typeof document !== 'undefined') {
    return createPortal(button, document.body)
  }

  return button
}
