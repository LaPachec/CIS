type PageHeaderProps = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-5 border-b border-slate-200 pb-4">
      <h1 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}
    </div>
  )
}
