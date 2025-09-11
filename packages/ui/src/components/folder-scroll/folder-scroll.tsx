import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

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
          <div className="size-full rounded-full bg-background/70"></div>
        </div>
      </div>
    </div>
  )
}
