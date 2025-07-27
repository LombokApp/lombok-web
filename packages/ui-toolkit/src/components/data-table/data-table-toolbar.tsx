'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, Input, TypographyH3 } from '@stellariscloud/ui-toolkit'
import type { Table } from '@tanstack/react-table'
import { Filter } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { DataTableFilter } from './data-table-filter'
import { DataTableSortList } from './data-table-sort-list'
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
  filters: Record<string, string[]>
  filterOptions?: Record<string, ColumnFilterOptions>
  enableSearch?: boolean
  searchPlaceholder?: string
  onFiltersChange?: (filters: Record<string, string[]>) => void
}

export function DataTableToolbar<TData>({
  title,
  filterOptions,
  enableSearch = false,
  searchPlaceholder,
  table,
  filters,
  onFiltersChange,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    Object.keys(filters).filter((key) => filters[key].length).length > 0

  const _searchFilterValue = React.useMemo<string | undefined>(() => {
    return 'search' in filters && filters.search.length ? filters.search[0] : ''
  }, [filters])

  const [searchFilterValue, setSearchFilterValue] = useState(_searchFilterValue)

  useEffect(() => {
    setSearchFilterValue(_searchFilterValue)
  }, [_searchFilterValue])

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-col items-start xl:flex-row xl:items-center">
        {title && (
          <div className="pl-2">
            <TypographyH3>{title}</TypographyH3>
          </div>
        )}
        <div className="flex items-center space-x-2 rounded-md p-1">
          <div className="flex items-center pl-2">
            <Filter className="size-5 text-foreground/40" />
          </div>
          {enableSearch && (
            <div className="bg-card">
              <Input
                placeholder={searchPlaceholder ?? 'Search...'}
                value={searchFilterValue}
                onChange={(event) => {
                  onFiltersChange?.({
                    ...(event.target.value
                      ? filters
                      : Object.fromEntries(
                          Object.entries(filters).filter(
                            ([key]) => key !== 'search',
                          ),
                        )),
                    ...(event.target.value
                      ? { search: [event.target.value] }
                      : {}),
                  })
                }}
                className="h-8 w-[150px] lg:w-[250px]"
              />
            </div>
          )}
          {filterOptions &&
            Object.keys(filterOptions).map((filterOptionKey, i) => (
              <DataTableFilter
                key={i}
                onFilterValuesChange={(values) =>
                  onFiltersChange?.({
                    ...filters,
                    [filterOptionKey]: values,
                  })
                }
                selectedValues={new Set(filters[filterOptionKey] ?? [])}
                title={filterOptions[filterOptionKey].label}
                options={filterOptions[filterOptionKey].options}
              />
            ))}

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => onFiltersChange?.({})}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
      <DataTableSortList table={table} />
    </div>
  )
}
