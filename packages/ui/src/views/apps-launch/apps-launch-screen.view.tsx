import { Badge } from '@lombokapp/ui-toolkit/components/badge'
import { Input } from '@lombokapp/ui-toolkit/components/input'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { LayoutGrid, Search } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { AppIcon } from '@/src/components/app-icon/app-icon'
import type { AppPathContribution } from '@/src/contexts/server'
import { useServerContext } from '@/src/contexts/server'

// Entrypoints whose app was installed within this window get a "New" badge.
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function isNew(entry: AppPathContribution): boolean {
  if (!entry.appCreatedAt) {
    return false
  }
  const installedAt = new Date(entry.appCreatedAt).getTime()
  return (
    Number.isFinite(installedAt) && Date.now() - installedAt < NEW_WINDOW_MS
  )
}

function AppTile({
  entry,
  icon,
}: {
  entry: AppPathContribution
  icon: AppPathContribution['icon']
}) {
  return (
    <Link
      to={entry.href}
      className={cn(
        'group relative flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center',
        'shadow-xs transition-all duration-200',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {isNew(entry) && (
        <Badge
          variant="soft"
          className="absolute right-3 top-3 bg-primary/10 text-primary"
        >
          New
        </Badge>
      )}
      <div
        className={cn(
          'flex size-20 items-center justify-center rounded-2xl',
          'bg-gradient-to-br from-primary/10 to-primary/[0.03]',
          'ring-1 ring-inset ring-border transition-colors duration-200',
          'group-hover:ring-primary/30',
        )}
      >
        <AppIcon
          icon={icon}
          appIdentifier={entry.appIdentifier}
          fallbackLabel={entry.label}
          size={44}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-foreground">
          {entry.label}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {entry.appLabel}
        </span>
      </div>
    </Link>
  )
}

function TileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6">
      <Skeleton className="size-20 rounded-2xl" />
      <div className="flex w-full flex-col items-center gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

const GRID_CLASSES =
  'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

export function AppsLaunchScreen() {
  const { appContributions, appsLoaded, getAppIcon } = useServerContext()
  const [query, setQuery] = React.useState('')

  const entrypoints = appContributions.uiEntrypointContributions.all

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return entrypoints
    }
    return entrypoints.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.appLabel.toLowerCase().includes(q),
    )
  }, [entrypoints, query])

  return (
    <ScrollArea className="size-full">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Launch an app
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Everything installed on your Lombok, in one place. Pick an
              entrypoint to jump straight in.
            </p>
          </div>
          <div className="relative w-full shrink-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps…"
              className="pl-9"
              aria-label="Search apps"
            />
          </div>
        </div>

        <div className="mt-8">
          {!appsLoaded ? (
            <div className={GRID_CLASSES}>
              {Array.from({ length: 12 }).map((_, i) => (
                <TileSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <LayoutGrid className="size-6 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {entrypoints.length === 0 ? 'No apps yet' : 'No matching apps'}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {entrypoints.length === 0
                  ? 'Apps you install will appear here, ready to launch.'
                  : 'No apps match your search. Try a different name.'}
              </p>
            </div>
          ) : (
            <div className={GRID_CLASSES}>
              {filtered.map((entry) => (
                <AppTile
                  key={entry.href}
                  entry={entry}
                  icon={entry.icon ?? getAppIcon(entry.appIdentifier)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
