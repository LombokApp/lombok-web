/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React from 'react'

import { Icon } from '../icon'

interface Item {
  id: string
  label: string
}

export function Dropdown({
  items,
  onItemSelect,
  value,
  emptyLabel,
  side = 'left',
}: {
  items: Item[]
  value?: string
  onItemSelect: (item: Item) => void
  emptyLabel: string
  side?: 'left' | 'right'
}) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const closeDropdown = React.useCallback(() => {
    setTimeout(() => {
      const el = document.activeElement as any
      el?.blur()
    }, 100)
  }, [])

  const onMouseDown = React.useCallback(() => {
    if (
      document.activeElement === dropdownRef.current ||
      dropdownRef.current?.contains(document.activeElement)
    ) {
      closeDropdown()
    }
  }, [closeDropdown])

  return (
    <div className="dropdown" ref={dropdownRef}>
      <label className="btn bg-base-100" onMouseDown={onMouseDown}>
        <div className="flex gap-2 items-center">
          {value ? value : emptyLabel} <Icon icon={ChevronDownIcon} />
        </div>
      </label>

      <ul
        className={clsx(
          'dropdown-content',
          'menu shadow bg-base-300',
          'border border-base-50',
          'rounded-lg min-w-[6rem] mt-2',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        {items.map((item, i) => {
          return (
            <li key={i} onMouseUp={onMouseDown}>
              <a onClick={() => onItemSelect(item)}>{item.label}</a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
/* eslint-enable jsx-a11y/no-static-element-interactions */
/* eslint-enable jsx-a11y/click-events-have-key-events */
/* eslint-enable jsx-a11y/anchor-is-valid */
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
