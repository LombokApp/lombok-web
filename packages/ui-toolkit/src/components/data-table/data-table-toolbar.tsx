'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, Input, TypographyH3 } from '@stellariscloud/ui-toolkit'
import type { Table } from '@tanstack/react-table'
import { Filter } from 'lucide-react'
import React from 'react'

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
}

export function DataTableToolbar<TData>({
  title,
  table,
  filterOptions,
  enableSearch = false,
  searchColumn,
  searchPlaceholder,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  if (enableSearch && !searchColumn) {
    throw new Error('Must set `searchColumn` if `enableSearch` is true.')
  }
  return (
    <div className="flex items-center gap-6">
      {title && <TypographyH3>{title}</TypographyH3>}
      <div className="flex items-center space-x-2 rounded-md border border-foreground/10 bg-card p-2">
        <div className="flex items-center pl-2 pr-1">
          <Filter className="size-5 text-foreground/30" />
        </div>
        {enableSearch && searchColumn && (
          <Input
            placeholder={searchPlaceholder ?? 'Search...'}
            value={table.getColumn(searchColumn)?.getFilterValue() as string}
            onChange={(event) =>
              table.getColumn(searchColumn)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
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
  )
}
