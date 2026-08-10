import type { ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  title: string
  children: ReactNode
  open: boolean
  onClose: () => void
}

export function Modal({ title, children, open, onClose }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="cis-surface w-full max-w-lg rounded-xl">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end border-t border-[var(--border)] px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
