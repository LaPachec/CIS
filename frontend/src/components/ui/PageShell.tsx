import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'

type PageShellProps = {
  title: string
  description?: string
  children: ReactNode
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section>
      <PageHeader title={title} description={description} />
      {children}
    </section>
  )
}
