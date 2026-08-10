type PageHeaderProps = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-700/80 bg-slate-950/45 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur">
      <span className="mb-2 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
        CIS Simulado
      </span>
      <h1 className="text-[1.55rem] font-semibold tracking-tight text-slate-50">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
          {description}
        </p>
      )}
    </div>
  )
}
