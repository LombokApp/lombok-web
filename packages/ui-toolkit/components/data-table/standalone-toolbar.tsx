import { Cross2Icon } from '@radix-ui/react-icons'
import type { SortingState } from '@tanstack/table-core'
import React from 'react'

import {
  Badge,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TypographyH3,
} from '../'
import { DataTableFilter } from './data-table-filter'

export interface ColumnFilterOptions {
  label: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export interface SortOption {
  id: string
  label: string
}

interface StandaloneToolbarProps {
  title?: string
  filters: Record<string, string[]>
  filterOptions?: Record<string, ColumnFilterOptions>
  enableSearch?: boolean
  searchPlaceholder?: string
  onFiltersChange?: (filters: Record<string, string[]>) => void
  // Sorting props
  sorting?: SortingState
  sortOptions?: SortOption[]
  onSortingChange?: (sorting: SortingState) => void
  enableSorting?: boolean
}

export function StandaloneToolbar({
  title,
  filterOptions,
  enableSearch = false,
  searchPlaceholder,
  filters,
  onFiltersChange,
  sorting = [],
  sortOptions = [],
  onSortingChange,
  enableSorting = false,
}: StandaloneToolbarProps) {
  const isFiltered =
    Object.keys(filters).filter((key) => filters[key]?.length !== 0).length > 0

  const _searchFilterValue = React.useMemo<string | undefined>(() => {
    return 'search' in filters && filters.search.length ? filters.search[0] : ''
  }, [filters])

  const [searchFilterValue, setSearchFilterValue] =
    React.useState(_searchFilterValue)

  React.useEffect(() => {
    setSearchFilterValue(_searchFilterValue)
  }, [_searchFilterValue])

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      onSortingChange?.(newSorting)
    },
    [onSortingChange],
  )

  const currentSortId = sorting[0]?.id ?? ''
  const currentSortDesc = sorting[0]?.desc ?? false

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-col items-start xl:flex-row xl:items-center">
        {title && (
          <div className="pl-2">
            <TypographyH3>{title}</TypographyH3>
          </div>
        )}
        <div className="flex items-center space-x-2 rounded-md p-1">
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
                className="w-[150px] lg:w-[250px]"
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
                title={filterOptions[filterOptionKey]?.label ?? ''}
                options={filterOptions[filterOptionKey]?.options ?? []}
              />
            ))}

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => onFiltersChange?.({})}
              className="px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
      {enableSorting && sortOptions.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Sort
              {sorting.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono text-[10.4px] font-normal"
                >
                  {sorting.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex w-full max-w-[400px] flex-col gap-3.5 p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={currentSortId}
                  onValueChange={(value) =>
                    handleSortingChange([{ id: value, desc: currentSortDesc }])
                  }
                >
                  <SelectTrigger className="h-8 rounded">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Select
                  value={currentSortDesc ? 'desc' : 'asc'}
                  onValueChange={(value) => {
                    const fallbackId = sortOptions[0]?.id ?? ''
                    if (fallbackId === '' && currentSortId === '') {
                      return
                    }
                    handleSortingChange([
                      {
                        id: currentSortId || fallbackId,
                        desc: value === 'desc',
                      },
                    ])
                  }}
                >
                  <SelectTrigger className="h-8 rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <Button
                size="sm"
                className="rounded"
                onClick={() => {
                  const first = sortOptions[0]
                  if (!first) {
                    return
                  }
                  handleSortingChange([{ id: first.id, desc: false }])
                }}
                disabled={sortOptions.length === 0}
              >
                Add sort
              </Button>
              {sorting.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded"
                  onClick={() => handleSortingChange([])}
                >
                  Reset sorting
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
