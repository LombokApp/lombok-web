import type { AppWorkersMap } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Settings } from 'lucide-react'
import type { FetchOptions } from 'openapi-fetch'
import { useState } from 'react'

import { EnvironmentVariablesModal } from '@/src/components/environment-variables-modal/environment-variables-modal'

export function configureServerAppWorkerScriptTableColumns(
  appIdentifier: string,
  setEnvironmentVariablesMutation: UseMutationResult<
    unknown,
    unknown,
    FetchOptions<{
      parameters: { path: { appIdentifier: string; workerIdentifier: string } }
      requestBody: {
        content: {
          'application/json': { environmentVariables: Record<string, string> }
        }
      }
    }>
  >,
): ColumnDef<AppWorkersMap[string] & { identifier: string }>[] {
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
      accessorKey: 'entrypoint',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Entrypoint"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            {appWorker.entrypoint}
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
            <EnvironmentVariablesModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              environmentVariables={appWorker.environmentVariables}
              onSubmit={async (envVarArray) => {
                // Convert array of {key, value} to Record<string, string>
                const environmentVariables: Record<string, string> = {}
                for (const { key, value } of envVarArray) {
                  environmentVariables[key] = value
                }
                await setEnvironmentVariablesMutation.mutateAsync({
                  params: {
                    path: {
                      appIdentifier,
                      workerIdentifier: appWorker.identifier,
                    },
                  },
                  body: { environmentVariables },
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
