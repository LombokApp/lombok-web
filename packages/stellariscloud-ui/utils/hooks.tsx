import React from 'react'

export type LineSelectFunc = (
  importPath: string,
  lineNumber: number,
  options?: {
    copyLinkToClipboard?: boolean
  },
) => void

export type BuildSelectSourceFunc = (
  importPath?: string,
  lineNumber?: number,
) => { pathname: string; query: { [key: string]: unknown } }

export const useBreakPoints = () => {
  const [breakpoints, setBreakPoints] = React.useState<{ md: boolean }>({
    md: false,
  })
  React.useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    setBreakPoints({ md: !mql.matches })
    const handleWidthChange = (e: MediaQueryListEvent) => {
      setBreakPoints({ md: !e.matches })
    }
    mql.addEventListener('change', handleWidthChange)
    return () => mql.removeEventListener('change', handleWidthChange)
  }, [])
  return breakpoints
}
