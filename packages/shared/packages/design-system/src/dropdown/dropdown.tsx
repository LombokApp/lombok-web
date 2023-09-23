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
  const dropdownRef = React.useRef<HTMLDetailsElement>(null)
  const closeDropdown = React.useCallback(() => {
    setTimeout(() => {
      dropdownRef.current?.removeAttribute('open')
    }, 100)
  }, [])

  return (
    <details className="dropdown" ref={dropdownRef}>
      <summary className="m-1 btn" onBlur={closeDropdown}>
        {value ? value : emptyLabel} <Icon icon={ChevronDownIcon} />
      </summary>
      <ul
        className={clsx(
          'dropdown-content',
          'menu shadow bg-base-100',
          // 'border border-base-50',
          'rounded-lg min-w-[6rem] mt-2',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        {items.map((item, i) => {
          return (
            <li key={i}>
              <a onClick={() => onItemSelect(item)}>{item.label}</a>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
/* eslint-enable jsx-a11y/no-static-element-interactions */
/* eslint-enable jsx-a11y/click-events-have-key-events */
/* eslint-enable jsx-a11y/anchor-is-valid */
