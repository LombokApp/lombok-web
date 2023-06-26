import type { LinkProps as NextLinkProps } from 'next/link'
import type { ReactNode } from 'react'

import { Link } from './link'

interface NavLinkProps extends NextLinkProps {
  children: ReactNode
}

export function NavLink({ children, ...rest }: NavLinkProps) {
  return (
    <Link
      className="inline-flex flex-col items-center tracking-wide whitespace-nowrap group"
      passHref
      {...rest}
    >
      <span>{children}</span>
    </Link>
  )
}
