import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type DrawerProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  side?: 'left' | 'right'
  labelledById?: string
}

export function Drawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  side = 'right',
  labelledById,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = labelledById ?? 'drawer-title'

  useEffect(() => {
    if (!open) {
      return
    }

    const previousActiveElement = document.activeElement
    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus()
      }
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/55 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'fixed top-0 flex h-full w-[min(100vw,520px)] max-w-full flex-col border-[var(--border)] bg-[var(--surface-strong)] shadow-xl outline-none',
          side === 'left' ? 'left-0' : 'right-0',
        ].join(' ')}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={onClose}
            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="border-t border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
