type EmptyStateProps = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  )
}
