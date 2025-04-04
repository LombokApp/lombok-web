'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, Input, TypographyH3 } from '@stellariscloud/ui-toolkit'
import type { Table } from '@tanstack/react-table'
import { Filter } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { DataTableFacetedFilter } from './data-table-faceted-filter'

export interface ColumnFilterOptions {
  label: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}
interface DataTableToolbarProps<TData> {
  title?: string
  table: Table<TData>
  filterOptions: Record<string, ColumnFilterOptions>
  enableSearch?: boolean
  searchColumn?: string
  searchPlaceholder?: string
  actionComponent?: React.ReactNode
}

export function DataTableToolbar<TData>({
  title,
  table,
  filterOptions,
  enableSearch = false,
  searchColumn,
  searchPlaceholder,
  actionComponent,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const _filterValue = searchColumn
    ? ((table.getColumn(searchColumn)?.getFilterValue() as
        | string
        | undefined) ?? '')
    : ''

  if (enableSearch && !searchColumn) {
    throw new Error('Must set `searchColumn` if `enableSearch` is true.')
  }

  const [filterValue, setFilterValue] = useState(_filterValue)

  useEffect(() => {
    setFilterValue(_filterValue)
  }, [_filterValue])

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-6">
        <div className="pl-2">
          {title && <TypographyH3>{title}</TypographyH3>}
        </div>
        <div className="flex items-center space-x-2 rounded-md p-1">
          <div className="flex items-center pl-2">
            <Filter className="size-5 text-foreground/40" />
          </div>
          {enableSearch && searchColumn && (
            <div className="bg-card">
              <Input
                placeholder={searchPlaceholder ?? 'Search...'}
                value={filterValue}
                onChange={(event) =>
                  table
                    .getColumn(searchColumn)
                    ?.setFilterValue(event.target.value)
                }
                className="h-8 w-[150px] lg:w-[250px]"
              />
            </div>
          )}
          {Object.keys(filterOptions)
            .filter((filterOption) => table.getColumn(filterOption))
            .map((filterOption, i) => (
              <DataTableFacetedFilter
                key={i}
                column={table.getColumn(filterOption)}
                title={filterOptions[filterOption].label}
                options={filterOptions[filterOption].options}
              />
            ))}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
      {actionComponent ? <div>{actionComponent}</div> : null}
    </div>
  )
}
