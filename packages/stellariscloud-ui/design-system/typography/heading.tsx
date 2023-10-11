import clsx from 'clsx'
import type { ComponentType, HTMLAttributes } from 'react'

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6
  as?: string | ComponentType<{ className: string }>
  customSize?: boolean
}

const levelToFontSize = {
  6: 'text-xl',
  5: 'text-2xl',
  4: 'text-3xl',
  3: 'text-4xl',
  2: 'text-5xl',
  1: 'text-6xl',
}

const levelToTracking = {
  6: 'tracking-tight',
  5: 'tracking-tight',
  4: 'tracking-tight',
  3: 'tracking-tight',
  2: 'tracking-wide',
  1: 'tracking-wider',
}

const levelToWeight = {
  6: 'font-semi-bold',
  5: 'font-semi-bold',
  4: 'font-semi-bold',
  3: 'font-bold',
  2: 'font-bold',
  1: 'font-black',
}

export function Heading({
  level,
  as,
  className,
  customSize = false,
  ...rest
}: HeadingProps) {
  const Component = as ?? `h${level}`

  const fontSizeClass = levelToFontSize[level]
  const trackingClass = levelToTracking[level]
  const weightClass = levelToWeight[level]

  return (
    <Component
      className={clsx(
        'font-heading',
        'tracking-wide',
        customSize ? null : fontSizeClass,
        trackingClass,
        weightClass,
        className,
      )}
      {...rest}
    />
  )
}

interface DecorativeHeadingProps {
  solidText?: string
  outlineText?: string
  className?: string
  level: HeadingProps['level']
}

export function DecorativeHeading({
  solidText = '',
  outlineText = '',
  className,
  level,
}: DecorativeHeadingProps) {
  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <Heading
        level={level}
        customSize
        className="text-5xl text-center md:text-7xl"
      >
        {solidText} <span className="outline-text">{outlineText}</span>
      </Heading>
      <div className="mt-1 h-[6px] w-[80px] stellariscloud-gradient" />
    </div>
  )
}
