import { createPortal } from 'react-dom'
import { ThemeToggleButton } from './ThemeToggleButton'

export function ThemeTogglePortal() {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(<ThemeToggleButton />, document.body)
}
