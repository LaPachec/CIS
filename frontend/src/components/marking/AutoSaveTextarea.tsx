import { useEffect, useRef, useState } from 'react'

type AutoSaveTextareaProps = {
  value: string
  disabled?: boolean
  onAutoSave: (value: string) => void
}

export function AutoSaveTextarea({
  value,
  disabled,
  onAutoSave,
}: AutoSaveTextareaProps) {
  const [localValue, setLocalValue] = useState(value)
  const lastSavedValue = useRef(value)

  useEffect(() => {
    if (disabled || localValue === lastSavedValue.current) {
      return
    }

    const timeout = window.setTimeout(() => {
      lastSavedValue.current = localValue
      onAutoSave(localValue)
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [disabled, localValue, onAutoSave])

  return (
    <textarea
      value={localValue}
      disabled={disabled}
      onChange={(event) => setLocalValue(event.target.value)}
      placeholder="Observação da avaliação"
      className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
    />
  )
}
