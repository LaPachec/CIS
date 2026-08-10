import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/useTheme'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'

  return (
    <button
      type="button"
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      onClick={toggleTheme}
      className={[
        `theme-${theme}`,
        'fixed right-4 top-4 z-[9999]',
        'flex h-11 w-11 items-center justify-center',
        'rounded-full border border-[var(--border)]',
        'bg-[var(--surface-strong)] text-[var(--text-primary)]',
        'shadow-lg shadow-black/10 backdrop-blur',
        'transition-colors duration-200 ease-out',
        'hover:bg-[var(--primary-soft)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--focus)]',
      ].join(' ')}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}
