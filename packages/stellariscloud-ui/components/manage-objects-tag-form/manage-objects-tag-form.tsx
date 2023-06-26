import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ObjectTagData } from '@stellariscloud/api-client'
import { Button, Icon } from '@stellariscloud/design-system'
import React from 'react'

import { TagDropdown } from '../tag-dropdown/tag-dropdown'

export const ManageObjectTagsForm = ({
  onUntagObject: onRemoveTag,
  onTagObject: onAddTag,
  onCreateTag: onCreateObjectTag,
  tags,
  objectTags,
}: {
  onUntagObject: (tagId: string) => Promise<void>
  onTagObject: (tagId: string) => Promise<void>
  onCreateTag: (tagName: string) => Promise<ObjectTagData>
  tags: ObjectTagData[]
  objectTags: ObjectTagData[]
}) => {
  const handleCreateObjectTag = React.useCallback(
    async (tagName: string) => {
      if (tagName.length > 0) {
        return onCreateObjectTag(tagName)
      }
      throw new Error('Invalid tag name.')
    },
    [onCreateObjectTag],
  )

  return (
    <div className="flex flex-col gap-4 justify-stretch">
      <div className="p-4 flex gap-4 border-2 rounded-md border-primary-text-content">
        <div className="flex flex-wrap flex-1 gap-2">
          {objectTags.length === 0 && <div className="italic">No tags</div>}
          {objectTags.map((objectTag) => (
            <div key={objectTag.id}>
              <Button onClick={() => void onRemoveTag(objectTag.id)}>
                {objectTag.name}
                <Icon size="md" className="shrink-0" icon={XMarkIcon} />
              </Button>
            </div>
          ))}
        </div>

        <TagDropdown
          onSelectTag={(tagId) => void onAddTag(tagId)}
          onCreateTag={handleCreateObjectTag}
          tags={tags}
          side="right"
        />
      </div>
    </div>
  )
}
