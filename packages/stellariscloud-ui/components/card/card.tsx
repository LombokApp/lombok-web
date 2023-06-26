import clsx from 'clsx'

export function Card({
  children,
  className,
  roundedClass,
}: {
  roundedClass?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={clsx(
        'card card-normal shadow-md',
        roundedClass ?? 'rounded-2xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
