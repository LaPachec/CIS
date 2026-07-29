import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { SaveStatusValue } from './marking-utils'

type SaveStatusProps = {
  status: SaveStatusValue
}

export function SaveStatus({ status }: SaveStatusProps) {
  if (status === 'idle') {
    return null
  }

  const config = {
    saving: {
      label: 'Salvando...',
      className: 'text-blue-700',
      icon: <Loader2 size={14} className="animate-spin" />,
    },
    saved: {
      label: 'Salvo',
      className: 'text-green-700',
      icon: <CheckCircle2 size={14} />,
    },
    error: {
      label: 'Erro ao Salvar',
      className: 'text-red-700',
      icon: <XCircle size={14} />,
    },
  }[status]

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}
