'use client'

import * as React from 'react'

import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  TableOptions,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table'
import { DataTablePagination } from './data-table-pagination'
import { ColumnFilterOptions, DataTableToolbar } from './data-table-toolbar'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterFns?: Record<string, FilterFn<TValue>>
  filterOptions?: Record<string, ColumnFilterOptions>
  manualFiltering?: boolean
  manualSorting?: boolean
  enableRowSelection?: boolean
  enableSearch?: boolean
  searchColumn?: string
  searchPlaceholder?: string
}

interface TableHandlerProps<TData> {
  onColumnFiltersChange?: TableOptions<TData>['onColumnFiltersChange']
  onSortingChange?: TableOptions<TData>['onSortingChange']
  onPaginationChange?: TableOptions<TData>['onPaginationChange']
  rowCount?: TableOptions<TData>['rowCount']
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterFns,
  filterOptions = {},
  rowCount = data.length,
  onColumnFiltersChange,
  onSortingChange,
  enableRowSelection = false,
  enableSearch = false,
  searchColumn,
  searchPlaceholder,
  manualFiltering = true,
  manualSorting = true,
}: DataTableProps<TData, TValue> & TableHandlerProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    rowCount,
    manualFiltering,
    manualSorting,
    columns,
    filterFns,
    enableGlobalFilter: false,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (...args) => {
      if (onSortingChange) {
        onSortingChange(...args)
      }
      setSorting(...args)
    },
    onColumnFiltersChange: (...args) => {
      if (onColumnFiltersChange) {
        onColumnFiltersChange(...args)
      }
      setColumnFilters(...args)
    },
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
    <div className="space-y-4 w-full">
      {(Object.keys(filterOptions).length > 0 || enableSearch) && (
        <DataTableToolbar
          enableSearch={enableSearch}
          searchColumn={searchColumn}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
          table={table}
        />
      )}
      <div className="rounded-md border bg-card border-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
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
      {rowCount > data.length && <DataTablePagination table={table} />}
    </div>
  )
}
