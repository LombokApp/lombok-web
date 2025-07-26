'use client'

import type {
  ColumnDef,
  PaginationState,
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  title?: string
  filters?: Record<string, string[]>
  filterOptions?: Record<string, ColumnFilterOptions>
  enableRowSelection?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  actionComponent?: React.ReactNode
  cellPadding?: string
  hideHeader?: boolean
  pageIndex?: number
}

interface TableHandlerProps<TData> {
  onColumnFiltersChange?: (filters: Record<string, string[]>) => void
  onSortingChange?: TableOptions<TData>['onSortingChange']
  onPaginationChange?: (paginationState: PaginationState) => void
  rowCount?: TableOptions<TData>['rowCount']
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  filters = {},
  filterOptions = {},
  rowCount = data.length,
  onColumnFiltersChange,
  onSortingChange,
  cellPadding = 'px-4 py-2',
  onPaginationChange,
  enableRowSelection = false,
  enableSearch = false,
  hideHeader = false,
  pageIndex = 0,
  searchPlaceholder,
  actionComponent,
}: DataTableProps<TData, TValue> & TableHandlerProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex,
    pageSize: 10,
  })

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
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className={cn('size-full gap-2 flex flex-col')}>
      {(Object.keys(filterOptions).length > 0 ||
        enableSearch ||
        actionComponent) && (
        <DataTableToolbar
          title={title}
          actionComponent={actionComponent}
          enableSearch={enableSearch}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={onColumnFiltersChange}
        />
      )}
      <div className="vertical-scrollbar-container">
        <div className="rounded-md border border-foreground/10 bg-card">
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
