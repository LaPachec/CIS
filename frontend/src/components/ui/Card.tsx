import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'cis-surface rounded-xl',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
