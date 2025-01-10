import { cn } from '@stellariscloud/ui-toolkit'

export function FolderScroll({
  viewHeight,
  marginTop,
}: {
  viewHeight?: number
  marginTop: number
}) {
  return (
    <div className={cn('h-full', 'bg-foreground/20 rounded-full')}>
      <div className={cn('h-full w-4 rounded-full')}>
        <div
          style={{
            height: `${viewHeight ?? 0}%`,
            marginTop: `${marginTop}px`,
          }}
          className=""
        >
          <div className="bg-background/70 size-full rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
