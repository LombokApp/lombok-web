import clsx from 'clsx'

import LoaderSvg from './loader.svg'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'text'
  className?: string
}

export function Spinner({ size = 'text', className }: SpinnerProps) {
  return (
    <LoaderSvg
      aria-hidden="true"
      className={clsx(
        size === 'sm'
          ? 'w-4 h-4'
          : size === 'md'
          ? 'w-6 h-6'
          : size === 'lg'
          ? 'w-10 h-10'
          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          size === 'text'
          ? 'w-em h-em'
          : null,
        'animate-spin',
        className,
      )}
    />
  )
}
