import clsx from 'clsx'
import type { LinkProps as NextLinkProps } from 'next/link'
import NextLink from 'next/link'
import type { ReactNode } from 'react'
import React from 'react'

interface LinkProps extends NextLinkProps {
  className?: string
  children: ReactNode
  anchor?: React.AnchorHTMLAttributes<HTMLAnchorElement>
}

export function Link({ className, children, anchor, ...rest }: LinkProps) {
  return (
    <NextLink
      passHref
      {...rest}
      className={clsx('no-underline', className)}
      {...anchor}
    >
      {children}
    </NextLink>
  )
}
