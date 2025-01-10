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
      <div className={cn('w-4 h-full rounded-full')}>
        <div
          style={{
            height: `${viewHeight ?? 0}%`,
            marginTop: `${marginTop}px`,
          }}
          className=""
        >
          <div className="size-full rounded-full bg-background/70"></div>
        </div>
      </div>
    </div>
  )
}
