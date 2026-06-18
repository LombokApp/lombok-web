import { Folders } from 'lucide-react'
import { useLocation } from 'react-router'

import type { ImageUrls } from '@/src/components/entity-avatar/entity-avatar'
import { EntityAvatar } from '@/src/components/entity-avatar/entity-avatar'

import { SidebarGroup } from './sidebar-group'
import { SidebarItem } from './sidebar-item'

interface StarredFolder {
  id: string
  name: string
  icon?: ImageUrls
}

export function SidebarFoldersSection({
  folders,
  isOpen,
}: {
  folders: StarredFolder[]
  isOpen: boolean | undefined
}) {
  const location = useLocation()

  const isFolderActive = (id: string) =>
    location.pathname === `/folders/${id}` ||
    location.pathname.startsWith(`/folders/${id}/`)

  return (
    <SidebarGroup label="Folders">
      <SidebarItem
        href="/folders"
        label="All Folders"
        isOpen={isOpen}
        active={location.pathname === '/folders'}
        icon={Folders}
      />
      {folders.map((folder) => (
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
        />
      ))}
    </SidebarGroup>
  )
}
