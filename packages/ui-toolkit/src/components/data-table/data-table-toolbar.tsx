'use client'

import React from 'react'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Button } from '@stellariscloud/ui-toolkit'
import { Table } from '@tanstack/react-table'

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
  table: Table<TData>
  filterOptions: Record<string, ColumnFilterOptions>
}

export function DataTableToolbar<TData>({
  table,
  filterOptions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
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
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
