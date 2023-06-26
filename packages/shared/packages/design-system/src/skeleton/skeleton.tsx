export function Skeleton({ className }: React.ComponentProps<'div'>) {
  return (
    <div
      className={`px-2 py-1 text-xs font-bold leading-none animate-pulse bg-slate-200 ${className}`}
    >
      &nbsp;
    </div>
  )
}
