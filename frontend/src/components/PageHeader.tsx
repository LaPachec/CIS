type PageHeaderProps = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
      )}
    </div>
  )
}
