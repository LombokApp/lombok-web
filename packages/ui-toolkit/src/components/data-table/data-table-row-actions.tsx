'use client'

import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { Row } from '@tanstack/react-table'
import React from 'react'

import {
  Button,
  ButtonGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../'

interface RowAction {
  label: string
  value: string
  isPinned: boolean
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
}
interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  actions: RowAction[]
}

export function DataTableRowActions<TData>({
  actions,
}: DataTableRowActionsProps<TData>) {
  const _actions = actions.reduce<{
    pinned: RowAction[]
    hidden: RowAction[]
  }>(
    (acc, next) => {
      if (next.isPinned) {
        acc.pinned.push(next)
      } else {
        acc.hidden.push(next)
      }
      return acc
    },
    { pinned: [], hidden: [] },
  )
  const hasHidden = _actions.hidden.length > 0
  const hasPinned = _actions.pinned.length > 0
  const needsGroup = _actions.pinned.length > 1 || (hasPinned && hasHidden)

  const buttonContent = _actions.pinned
    .map((action, i) => (
      <Button
        key={i}
        variant="outline"
        size="xs"
        onClick={action.onClick}
        className="data-[state=open]:bg-muted flex p-2 px-4"
      >
        <div className="flex items-center gap-1">
          {action.icon ? <action.icon /> : null}
          <span>{action.label}</span>
        </div>
      </Button>
    ))
    .concat(
      hasHidden
        ? [
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className="data-[state=open]:bg-muted flex w-8 p-0"
              >
                <DotsHorizontalIcon className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>,
          ]
        : [],
    )
  const content = needsGroup ? (
    <ButtonGroup>{...buttonContent}</ButtonGroup>
  ) : (
    buttonContent
  )
  return hasHidden ? (
    <DropdownMenu>
      {content}
      <DropdownMenuContent align="end" className="w-[160px]">
        {_actions.hidden.map((action, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onClick={action.onClick}>
              <div className="flex items-center gap-1">
                {action.icon ? <action.icon /> : null}
                <span>{action.label}</span>
              </div>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    content
  )
}
