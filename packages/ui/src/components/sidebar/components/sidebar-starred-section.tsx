import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@lombokapp/ui-toolkit/components/collapsible'
import { ChevronRight, Star } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import type { ImageUrls } from '@/src/components/entity-avatar/entity-avatar'
import { EntityAvatar } from '@/src/components/entity-avatar/entity-avatar'

import { SidebarItem } from './sidebar-item'

interface StarredFolder {
  id: string
  name: string
  icon?: ImageUrls
}

export function SidebarStarredSection({
  folders,
  isOpen,
}: {
  folders: StarredFolder[]
  isOpen: boolean | undefined
}) {
  const location = useLocation()
  const [expanded, setExpanded] = React.useState(true)

  if (folders.length === 0) {
    return null
  }

  const isFolderActive = (id: string) =>
    location.pathname === `/folders/${id}` ||
    location.pathname.startsWith(`/folders/${id}/`)

  const folderItems = folders.map((folder) => (
    <SidebarItem
      key={folder.id}
      href={`/folders/${folder.id}`}
      label={folder.name}
      isOpen={isOpen}
      active={isFolderActive(folder.id)}
      icon={
        <EntityAvatar
          kind="folder"
          name={folder.name}
          image={folder.icon}
          size="sm"
          className="size-4 rounded"
        />
      }
      // Indent rows under the section header so the list reads as nested.
      className={isOpen === false ? undefined : 'pl-7'}
    />
  ))

  // Collapsed rail: no room for the header/chevron, so surface the starred
  // folders directly as icon-only rows (SidebarItem adds hover tooltips).
  if (isOpen === false) {
    return (
      <li className="w-full">
        <div className="space-y-1 px-3">{folderItems}</div>
      </li>
    )
  }

  return (
    <li className="w-full">
      <div className="space-y-1 px-3">
        <Collapsible
          open={expanded}
          onOpenChange={setExpanded}
          className="w-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 w-full justify-start px-2 font-normal text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground [&[data-state=open]_.starred-chevron]:rotate-90"
            >
              <span className="flex w-full items-center">
                <Star className="size-4 shrink-0" />
                <span className="grid grid-cols-[1fr] overflow-hidden pl-3">
                  <span className="min-w-0 truncate text-sm">Starred</span>
                </span>
                <ChevronRight className="starred-chevron ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <div className="mt-1 space-y-1">{folderItems}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </li>
  )
}
