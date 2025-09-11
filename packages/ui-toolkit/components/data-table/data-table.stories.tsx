import type { Meta, StoryObj } from '@storybook/react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from './data-table'
import { DataTableColumnHeader } from './data-table-column-header'

const meta: Meta<typeof DataTable> = {
  title: 'Components/DataTable',
  component: DataTable,
}

export default meta

type Story = StoryObj<typeof DataTable>

export const demoColumns: ColumnDef<{ id: string; name: string }>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Id"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-[140px] flex-col text-xs">{row.original.id}</div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-start gap-2">{row.original.name}</div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <DataTable
      data={[
        { id: '_1', name: 'Name 1' },
        { id: '_2', name: 'Name 2' },
      ]}
      columns={demoColumns}
    />
  ),
}
