import { useAppBrowserSdk } from '../hooks/app-browser-sdk/app-browser-sdk.hook'

export function Link({
  to,
  children,
  className = '',
}: {
  className?: string
  to: { pathAndQuery: string }
  children: React.ReactNode
}) {
  const { navigateTo } = useAppBrowserSdk()

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    void navigateTo(to)
  }

  return (
    <span
      onClick={handleClick}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </span>
  )
}
