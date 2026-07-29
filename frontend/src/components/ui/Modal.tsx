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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
