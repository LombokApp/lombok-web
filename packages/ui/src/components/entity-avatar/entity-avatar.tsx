import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@lombokapp/ui-toolkit/components/avatar'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { FolderIcon } from 'lucide-react'
import React from 'react'

export type EntityAvatarSize = 'sm' | 'md' | 'lg'
export type EntityAvatarKind = 'user' | 'folder'

const SIZE_TO_URL_KEY: Record<EntityAvatarSize, 'small' | 'medium' | 'large'> =
  {
    sm: 'small',
    md: 'medium',
    lg: 'large',
  }

export interface ImageUrls {
  small: string
  medium: string
  large: string
}

interface EntityAvatarProps {
  kind: EntityAvatarKind
  name?: string | null
  image?: ImageUrls
  size?: EntityAvatarSize
  className?: string
}

function getUserInitial(name?: string | null): string {
  if (!name) {
    return '?'
  }
  const first = name.trim().charAt(0)
  return first.length > 0 ? first.toUpperCase() : '?'
}

export function EntityAvatar({
  kind,
  name,
  image,
  size = 'md',
  className,
}: EntityAvatarProps) {
  const imageUrl = image?.[SIZE_TO_URL_KEY[size]]
  const isFolder = kind === 'folder'

  return (
    <Avatar
      className={cn(
        isFolder ? 'rounded-md' : 'rounded-full',
        'bg-muted',
        className,
      )}
    >
      {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
      <AvatarFallback
        className={cn(
          isFolder ? 'rounded-md' : 'rounded-full',
          'bg-muted text-muted-foreground',
        )}
      >
        {isFolder ? (
          <FolderIcon className="size-1/2" aria-hidden />
        ) : (
          <span className="text-sm font-medium uppercase">
            {getUserInitial(name)}
          </span>
        )}
      </AvatarFallback>
    </Avatar>
  )
}

EntityAvatar.displayName = 'EntityAvatar'

export default React.memo(EntityAvatar)
