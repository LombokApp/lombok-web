import type { components } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { FileText } from 'lucide-react'
import React from 'react'

export type DockerSession = components['schemas']['DockerSession']

const STATE_COLOR: Record<string, string> = {
  active: 'bg-green-500',
  created: 'bg-amber-500',
  closing: 'bg-zinc-400',
}

function formatAge(fromMs: number): string {
  const secs = Math.max(0, Math.floor((Date.now() - fromMs) / 1000))
  if (secs < 60) {
    return `${secs}s`
  }
  const mins = Math.floor(secs / 60)
  if (mins < 60) {
    return `${mins}m`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  return `${Math.floor(hours / 24)}d`
}

function createColumns(
  selectedSessionId: string | null,
  onSelectSession: (id: string | null) => void,
): HideableColumnDef<DockerSession>[] {
  return [
    {
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'size-2 rounded-full',
              STATE_COLOR[row.original.state] ?? 'bg-zinc-400',
            )}
          />
          {row.original.state}
        </span>
      ),
    },
    { accessorKey: 'label', header: 'Label' },
    {
      accessorKey: 'appId',
      header: 'App',
      cell: ({ row }) =>
        row.original.appId ?? <span className="text-muted-foreground">—</span>,
    },
    { accessorKey: 'protocol', header: 'Protocol' },
    {
      id: 'container',
      header: 'Container',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.containerId.slice(0, 12)}
        </span>
      ),
    },
    {
      id: 'host',
      header: 'Host',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.hostId ? row.original.hostId.slice(0, 8) : '—'}
        </span>
      ),
    },
    { accessorKey: 'clientCount', header: 'Clients' },
    {
      id: 'age',
      header: 'Age',
      cell: ({ row }) => formatAge(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const sid = row.original.id
        const active = selectedSessionId === sid
        return (
          <button
            type="button"
            onClick={() => onSelectSession(active ? null : sid)}
            className={cn(
              'flex items-center gap-1 rounded border px-2 py-1 text-xs',
              active
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                : 'border-border text-muted-foreground',
            )}
          >
            <FileText className="size-3" />
            Logs
          </button>
        )
      },
    },
  ]
}

interface BridgeSessionsTableProps {
  sessions: DockerSession[]
  selectedSessionId: string | null
  onSelectSession: (id: string | null) => void
}

export function BridgeSessionsTable({
  sessions,
  selectedSessionId,
  onSelectSession,
}: BridgeSessionsTableProps) {
  const columns = React.useMemo(
    () => createColumns(selectedSessionId, onSelectSession),
    [selectedSessionId, onSelectSession],
  )
  return (
    <DataTable
      title="Sessions"
      data={sessions}
      columns={columns}
      rowCount={sessions.length}
    />
  )
}
