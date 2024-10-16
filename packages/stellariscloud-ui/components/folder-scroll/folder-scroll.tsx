import clsx from 'clsx'

export function FolderScroll({
  viewHeight,
  marginTop,
}: {
  viewHeight?: number
  marginTop: number
}) {
  return (
    <div className={clsx('h-full', 'bg-foreground/20 rounded-full')}>
      <div className={clsx('w-4 h-full rounded-full')}>
        <div
          style={{
            height: `${viewHeight ?? 0}%`,
            marginTop: `${marginTop}px`,
          }}
          className=""
        >
          <div className="h-full w-full bg-background/70 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
