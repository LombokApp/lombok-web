import { LayoutGrid } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import { AppIcon } from '@/src/components/app-icon/app-icon'
import type { AppPathContribution } from '@/src/contexts/server'
import { useServerContext } from '@/src/contexts/server'

import { SidebarGroup } from './sidebar-group'
import { SidebarItem } from './sidebar-item'

// How many recently-added entrypoints to surface inline; the rest live on /apps.
const RECENT_LIMIT = 5

// Most recent first; entries without a known install time sort last.
function byRecency(a: AppPathContribution, b: AppPathContribution) {
  return (b.appCreatedAt ?? '').localeCompare(a.appCreatedAt ?? '')
}

export function SidebarAppsSection({
  entrypoints,
  isOpen,
}: {
  entrypoints: AppPathContribution[]
  isOpen: boolean | undefined
}) {
  const location = useLocation()
  const { getAppIcon } = useServerContext()

  const recent = React.useMemo(
    () => [...entrypoints].sort(byRecency).slice(0, RECENT_LIMIT),
    [entrypoints],
  )

  return (
    <SidebarGroup label="Apps">
      <SidebarItem
        href="/apps"
        label="All apps"
        isOpen={isOpen}
        active={location.pathname === '/apps'}
        icon={LayoutGrid}
      />
      {recent.map((entry) => (
        <SidebarItem
          key={entry.href}
          href={entry.href}
          label={entry.label}
          isOpen={isOpen}
          active={location.pathname === entry.href}
          icon={
            <AppIcon
              icon={entry.icon ?? getAppIcon(entry.appIdentifier)}
              appIdentifier={entry.appIdentifier}
              fallbackLabel={entry.label}
              size={16}
            />
          }
        />
      ))}
    </SidebarGroup>
  )
}
