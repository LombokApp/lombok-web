'use client'

import type {
  ColumnDef,
  ColumnSort,
  PaginationState,
  RowData,
  SortingState,
  TableOptions,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
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

export type HideableColumnDef<
  TData extends RowData,
  TValue = unknown,
> = ColumnDef<TData, TValue> & {
  forceHiding?: boolean
  zeroWidth?: boolean
}

interface DataTableProps<TData, TValue> {
  columns: HideableColumnDef<TData, TValue>[]
  data: TData[]
  title?: string
  filters?: Record<string, string[]>
  sorting?: SortingState
  filterOptions?: Record<string, ColumnFilterOptions>
  enableRowSelection?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  cellPadding?: string
  hideHeader?: boolean
  pagination?: PaginationState
}

interface TableHandlerProps<TData> {
  onColumnFiltersChange?: (filterState: Record<string, string[]>) => void
  onSortingChange?: (sortState: ColumnSort[]) => void
  onPaginationChange?: (paginationState: PaginationState) => void
  rowCount?: TableOptions<TData>['rowCount']
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  filters = {},
  sorting = [],
  filterOptions = {},
  rowCount = data.length,
  onColumnFiltersChange,
  onSortingChange,
  cellPadding = 'px-4 py-2',
  onPaginationChange,
  enableRowSelection = false,
  enableSearch = false,
  hideHeader = false,
  pagination = {
    pageIndex: 0,
    pageSize: 10,
  },
  searchPlaceholder,
}: DataTableProps<TData, TValue> & TableHandlerProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const columnVisibility = React.useMemo<VisibilityState>(
    () =>
      columns.reduce<VisibilityState>((acc, column) => {
        if (column.id && column.forceHiding) {
          acc[column.id] = false
        }
        return acc
      }, {}),
    [columns],
  )

  const table = useReactTable({
    data,
    rowCount,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    columns,
    enableGlobalFilter: false,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const updated = updater instanceof Function ? updater(sorting) : updater
      onSortingChange?.(updated)
    },
    onPaginationChange: (updater) => {
      const updated =
        updater instanceof Function ? updater(pagination) : updater
      onPaginationChange?.(updated)
    },
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className={cn('size-full gap-2 flex flex-col')}>
      {(Object.keys(filterOptions).length > 0 || enableSearch) && (
        <DataTableToolbar
          table={table}
          title={title}
          enableSearch={enableSearch}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={onColumnFiltersChange}
        />
      )}
      <div className="vertical-scrollbar-container">
        <div className="rounded-md border border-foreground/10 bg-background">
          <Table>
            {!hideHeader && (
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => {
                  return (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={
                              (
                                header.column
                                  .columnDef as HideableColumnDef<TData>
                              ).zeroWidth
                                ? 'w-0 p-0'
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
                  )
                })}
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
                            (cell.column.columnDef as HideableColumnDef<TData>)
                              .zeroWidth
                              ? 0
                              : undefined
                          }
                          key={cell.id}
                          className={
                            (cell.column.columnDef as HideableColumnDef<TData>)
                              .zeroWidth
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
