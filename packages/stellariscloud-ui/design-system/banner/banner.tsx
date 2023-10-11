import clsx from 'clsx'

export function Banner({
  body,
  type = 'neutral',
}: {
  body: string
  type?: 'info' | 'error' | 'warn' | 'neutral'
}) {
  return (
    <>
      <div
        className={clsx(
          'flex items-center justify-between gap-x-6 px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5',
          type === 'info'
            ? 'bg-gray-900 text-white'
            : type === 'warn'
            ? 'bg-amber-300 text-gray-800'
            : type === 'error'
            ? 'bg-red-500 text-white'
            : 'border border-gray-500 text-gray-500',
        )}
      >
        <p className="text-sm leading-6">{body}</p>
      </div>
    </>
  )
}
