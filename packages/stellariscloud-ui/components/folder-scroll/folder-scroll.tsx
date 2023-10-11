import clsx from 'clsx'

export function FolderScroll({
  viewHeight,
  marginTop,
}: {
  viewHeight?: number
  marginTop: number
}) {
  return (
    <div className={clsx('h-full', 'bg-gray-100 dark:bg-white/10 rounded-md')}>
      <div className={clsx('px-1.5 w-6 h-full rounded-full')}>
        <div
          style={{
            height: `${viewHeight ?? 0}%`,
            marginTop: `${marginTop}px`,
          }}
          className="py-2"
        >
          <div className="h-full w-full bg-black/[.5] dark:bg-white/[.1] rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
