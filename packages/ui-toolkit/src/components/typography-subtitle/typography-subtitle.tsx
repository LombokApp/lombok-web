import React from 'react'

export function TypographySubtitle({
  children,
}: {
  children: React.ReactNode
}) {
  return <span className="text-sm text-foreground/80">{children}</span>
}
