import * as React from 'react'

import { useAppBrowserSdk } from '../hooks/app-browser-sdk/app-browser-sdk.hook'

export type LinkProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> & {
  to: { pathAndQuery: string }
}

// Forwards ref + arbitrary anchor props so it composes as a Radix `asChild`
// child (e.g. TabsTrigger), which relies on passing down `data-state`, role,
// and event handlers.
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function Link(
    { to, children, className = '', style, onClick, ...rest },
    ref,
  ) {
    const { navigateTo, parentBasePath } = useAppBrowserSdk()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) {
        return
      }
      e.stopPropagation()
      e.preventDefault()
      void navigateTo(to)
    }

    return (
      <a
        ref={ref}
        href={`${parentBasePath}${to.pathAndQuery}`}
        className={className}
        style={{ cursor: 'pointer', ...style }}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </a>
    )
  },
)
