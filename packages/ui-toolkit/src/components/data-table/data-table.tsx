'use client'

import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  PaginationState,
  SortingState,
  TableOptions,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'

import { cn } from '@/utils'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table'
import { DataTablePagination } from './data-table-pagination'
import type { ColumnFilterOptions } from './data-table-toolbar'
import { DataTableToolbar } from './data-table-toolbar'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  title?: string
  filterFns?: Record<string, FilterFn<TValue>>
  filterOptions?: Record<string, ColumnFilterOptions>
  manualFiltering?: boolean
  manualSorting?: boolean
  enableRowSelection?: boolean
  enableSearch?: boolean
  searchColumn?: string
  searchPlaceholder?: string
  actionComponent?: React.ReactNode
  fullHeight?: boolean
  cellPadding?: string
  hideHeader?: boolean
  pageIndex?: number
}

interface TableHandlerProps<TData> {
  onColumnFiltersChange?: (columnFiltersState: ColumnFiltersState) => void
  onSortingChange?: TableOptions<TData>['onSortingChange']
  onPaginationChange?: (paginationState: PaginationState) => void
  rowCount?: TableOptions<TData>['rowCount']
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  filterFns,
  filterOptions = {},
  rowCount = data.length,
  onColumnFiltersChange,
  onSortingChange,
  cellPadding = 'px-4 py-2',
  onPaginationChange,
  enableRowSelection = false,
  enableSearch = false,
  searchColumn,
  fullHeight = false,
  hideHeader = false,
  pageIndex = 0,
  searchPlaceholder,
  manualFiltering = true,
  manualSorting = true,
  actionComponent,
}: DataTableProps<TData, TValue> & TableHandlerProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    rowCount,
    manualFiltering,
    manualSorting,
    manualPagination: true,
    columns,
    filterFns,
    enableGlobalFilter: false,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const updated = updater instanceof Function ? updater(sorting) : updater
      if (onSortingChange) {
        onSortingChange(updated)
      }
      setSorting(updated)
    },
    onPaginationChange: (updater) => {
      const updated =
        updater instanceof Function ? updater(pagination) : updater
      if (onPaginationChange) {
        onPaginationChange(updated)
      }
      setPagination(updated)
    },
    onColumnFiltersChange: (updater) => {
      const updated =
        updater instanceof Function ? updater(columnFilters) : updater
      if (onColumnFiltersChange) {
        onColumnFiltersChange(updated)
      }
      setColumnFilters(updated)
    },
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  if (enableSearch && !searchColumn) {
    throw new Error('Must set `searchColumn` if `enableSearch` is true.')
  }

  return (
    <div
      className={cn('w-full space-y-2', fullHeight && 'h-full flex flex-col')}
    >
      {(Object.keys(filterOptions).length > 0 ||
        enableSearch ||
        actionComponent) && (
        <DataTableToolbar
          title={title}
          actionComponent={actionComponent}
          enableSearch={enableSearch}
          searchColumn={searchColumn}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
          table={table}
        />
      )}
      <div className="flex-1 overflow-hidden rounded-md">
        <div className="custom-scrollbar h-full overflow-y-auto rounded-md border border-foreground/10 bg-card">
          <Table>
            {!hideHeader && (
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={
                            header.column.columnDef.id?.startsWith('__HIDDEN__')
                              ? 'p-0'
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
            )}
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="relative"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell
                          width={
                            cell.column.columnDef.id?.startsWith('__HIDDEN__')
                              ? 0
                              : undefined
                          }
                          key={cell.id}
                          className={
                            cell.column.columnDef.id?.startsWith('__HIDDEN__')
                              ? 'w-0 p-0'
                              : cellPadding
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {rowCount > data.length && <DataTablePagination table={table} />}
    </div>
  )
}
