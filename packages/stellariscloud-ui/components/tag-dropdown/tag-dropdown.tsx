/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { PlusSmallIcon, TagIcon } from '@heroicons/react/24/outline'
import type { ObjectTagData } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { Input } from '../../design-system/input/input'

export const TagDropdown = ({
  onCreateTag,
  tags,
  onSelectTag,
  addTagText = 'Add',
  side = 'left',
  shouldShowCreate = true,
}: {
  addTagText?: string
  shouldShowCreate?: boolean
  onSelectTag: (tagId: string) => void
  onCreateTag?: (tagName: string) => Promise<ObjectTagData>
  side?: 'left' | 'right'
  tags: ObjectTagData[]
}) => {
  const [creatingTagName, setCreatingTagName] = React.useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const closeDropdown = React.useCallback(() => {
    setTimeout(() => {
      const el = document.activeElement as any
      el?.blur()
      setCreatingTagName('')
    }, 100)
  }, [])

  const handelCreateTag = React.useCallback(async () => {
    if (onCreateTag && creatingTagName.length > 0) {
      await onCreateTag(creatingTagName)
      setCreatingTagName('')
    }
  }, [onCreateTag, creatingTagName])

  return (
    <div ref={dropdownRef} className={clsx('dropdown dropdown-bottom')}>
      <label
        className="btn"
        tabIndex={0}
        onMouseDown={() => {
          if (
            document.activeElement === dropdownRef.current ||
            dropdownRef.current?.contains(document.activeElement)
          ) {
            closeDropdown()
          }
        }}
      >
        <div className="flex gap-2 items-center">
          <Icon size="md" className="shrink-0" icon={TagIcon} />
          <div className="shrink-0">{addTagText}</div>
        </div>
      </label>
      <ul
        tabIndex={0}
        className={clsx(
          'dropdown-content menu shadow bg-base-300 border border-base-50 rounded-lg w-[20rem] mt-2 right-0',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        {tags.length === 0 && (
          <li className="p-4 py-6 italic opacity-50">No tags</li>
        )}
        {tags.map((tag, i) => {
          return (
            <li key={i}>
              <a onClick={() => onSelectTag(tag.id)}>{tag.name}</a>
            </li>
          )
        })}
        {shouldShowCreate && (
          <li className="flex">
            <div className="flex ">
              <Input
                className="bg-gray-100 p-0"
                value={creatingTagName}
                placeholder="create new tag"
                onChange={(e) => setCreatingTagName(e.target.value)}
              />
              <Button onClick={() => void handelCreateTag()}>
                <Icon icon={PlusSmallIcon} />
              </Button>
            </div>
          </li>
        )}
      </ul>
    </div>
  )
}
/* eslint-enable jsx-a11y/anchor-is-valid */
/* eslint-enable jsx-a11y/click-events-have-key-events */
/* eslint-enable jsx-a11y/no-static-element-interactions */
/* eslint-enable jsx-a11y/label-has-associated-control */
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-enable jsx-a11y/no-noninteractive-tabindex */
