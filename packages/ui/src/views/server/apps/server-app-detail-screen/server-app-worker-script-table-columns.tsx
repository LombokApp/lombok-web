'use client'

import { Button } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Settings } from 'lucide-react'
import type { FetchOptions } from 'openapi-fetch'
import { useState } from 'react'

import { EnvVarModal } from '@/src/components/env-var-modal/env-var-modal'
import type { AppDTO } from '@/src/services/api'

export function configureServerAppWorkerScriptTableColumns(
  appIdentifier: string,
  setEnvVarsMutation: UseMutationResult<
    unknown,
    unknown,
    FetchOptions<{
      parameters: { path: { appIdentifier: string; workerIdentifier: string } }
      requestBody: {
        content: { 'application/json': { envVars: Record<string, string> } }
      }
    }>
  >,
): ColumnDef<AppDTO['workerScripts'][0]>[] {
  return [
    {
      accessorKey: 'identifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Identifier"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="truncate">{row.original.identifier}</div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Description"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            {appWorker.description}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'IP',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Files"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            ({appWorker.files.length}){' '}
            {appWorker.files
              .map((file) => {
                const prefix = `/workers/${appWorker.identifier}/`
                return file.path.startsWith(prefix)
                  ? file.path.slice(prefix.length)
                  : file.path
              })
              .join(', ')}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const [modalOpen, setModalOpen] = useState(false)
        const appWorker = row.original
        return (
          <>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size={'sm'}
                onClick={() => setModalOpen(true)}
              >
                <Settings className="size-5" />
              </Button>
            </div>
            <EnvVarModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              envVars={appWorker.envVars}
              onSubmit={async (envVarArray) => {
                // Convert array of {key, value} to Record<string, string>
                const envVars: Record<string, string> = {}
                for (const { key, value } of envVarArray) {
                  envVars[key] = value
                }
                await setEnvVarsMutation.mutateAsync({
                  params: {
                    path: {
                      appIdentifier,
                      workerIdentifier: appWorker.identifier,
                    },
                  },
                  body: { envVars },
                })
                setModalOpen(false)
              }}
            />
          </>
        )
      },
    },
  ]
}
