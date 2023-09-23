import clsx from 'clsx'
import type { LinkProps as NextLinkProps } from 'next/link'
import type { ReactNode } from 'react'

import { Link } from './link'

interface NavLinkProps extends NextLinkProps {
  children: ReactNode
  className: string
}

export function NavLink({ className, children, ...rest }: NavLinkProps) {
  return (
    <Link
      className={clsx(
        'inline-flex flex-col items-center tracking-wide whitespace-nowrap group',
        className,
      )}
      passHref
      {...rest}
    >
      <span>{children}</span>
    </Link>
  )
}
