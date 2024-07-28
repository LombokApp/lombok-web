import {
  CircleStackIcon,
  DocumentTextIcon,
  FilmIcon,
  FolderIcon,
  GlobeAltIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { EmptyState } from '../../../design-system/empty-state/empty-state'
import { Icon } from '../../../design-system/icon'
import { Table } from '../../../design-system/table/table'
import { apiClient } from '../../../services/api'
import type { StorageProvisionFormValues } from './storage-provision-form'
import { StorageProvisionForm } from './storage-provision-form'
import { StorageProvisionDTO } from '@stellariscloud/api-client'

export function StorageProvisionTable({
  storageProvisions,
  onEdit,
  onDelete,
}: {
  storageProvisions: StorageProvisionDTO[]
  onEdit: (l: StorageProvisionDTO) => void
  onDelete: (l: StorageProvisionDTO) => void
}) {
  return (
    <Table
      headers={[
        'Server',
        { label: 'Storage Provisions', cellStyles: 'w-[99%]' },
        'Provision Types',
        'Actions',
      ]}
      rows={storageProvisions.map((storageProvision, i) => [
        <div key={i} className="flex flex-col gap-1">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {storageProvision.label}
          </div>
          <div className="flex gap-1">
            <span
              className={clsx(
                'px-2 py-1',
                'inline-flex rounded-md',
                'bg-yellow-50 dark:bg-yellow-50/20',
                'font-normal text-xs',
                'text-yellow-800 dark:text-yellow-300',
                'ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-600/50',
              )}
            >
              <div className="flex gap-2 items-center">
                <Icon
                  icon={KeyIcon}
                  className="dark:text-yellow-300 text-yellow-800"
                  size="sm"
                />
                <span>{storageProvision.accessKeyId}</span>
              </div>
            </span>
            <span
              className={clsx(
                'px-2 py-1',
                'inline-flex rounded-md',
                'bg-green-50 dark:bg-green-50/10',
                'font-medium text-xs',
                'text-green-700 dark:text-green-400',
                'ring-1 ring-inset ring-green-600/20',
              )}
            >
              <div className="flex gap-2 items-center">
                <Icon
                  icon={GlobeAltIcon}
                  className="text-green-700 dark:text-green-400"
                  size="sm"
                />
                <span>{storageProvision.region}</span>
              </div>
            </span>
          </div>
        </div>,
        <div key={i} className="flex flex-col items-start">
          <div className="flex gap-2">
            <div>
              <span className="opacity-70 dark:opacity-50">Endpoint: </span>
              <span className="font-semibold">{storageProvision.endpoint}</span>
            </div>
          </div>
          <div>
            <span className="opacity-70 dark:opacity-50">Bucket: </span>
            <span className="font-semibold">{storageProvision.bucket}</span>
          </div>
          {storageProvision.prefix && (
            <div>
              <span className="opacity-70 dark:opacity-50">Prefix: </span>
              <span className="font-semibold">{storageProvision.prefix}</span>
            </div>
          )}
        </div>,
        <div className="flex gap-2">
          {storageProvision.provisionTypes.map((provisionType) => (
            <span
              key={provisionType}
              className={clsx(
                'px-2 py-1',
                'inline-flex rounded-md',
                'bg-blue-50 dark:bg-blue-50/20',
                'font-normal text-xs',
                'text-blue-800 dark:text-blue-300',
                'ring-1 ring-inset ring-blue-600/20 dark:ring-blue-300/50',
              )}
            >
              <div className="flex gap-2 items-center">
                <Icon
                  icon={
                    provisionType === 'CONTENT'
                      ? FilmIcon
                      : provisionType === 'METADATA'
                        ? DocumentTextIcon
                        : CircleStackIcon
                  }
                  className="dark:text-blue-300 text-blue-800"
                  size="sm"
                />
                <span>{provisionType}</span>
              </div>
            </span>
          ))}
        </div>,
        <div key={i} className="flex gap-2">
          <ButtonGroup
            buttons={[
              {
                name: '',
                icon: PencilSquareIcon,
                onClick: () => onEdit(storageProvision),
              },
              {
                name: '',
                icon: TrashIcon,
                onClick: () => onDelete(storageProvision),
              },
            ]}
          />
        </div>,
      ])}
    />
  )
}

export function ServerStorageConfig() {
  const [storageProvisions, setStorageProvisions] =
    React.useState<StorageProvisionDTO[]>()

  const [editingStorageProvision, setEditingStorageProvision] = React.useState<
    Partial<{
      storageProvision: StorageProvisionDTO
      mutationType: 'CREATE' | 'UPDATE'
    }>
  >()

  const handleAddStorageProvision = React.useCallback(
    (input: StorageProvisionFormValues) =>
      apiClient.storageProvisionsApi
        .createServerProvision({
          storageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => {
          setStorageProvisions(resp.data.result)
        }),
    [],
  )

  const handleUpdateStorageProvision = React.useCallback(
    (
      storageProvision: StorageProvisionDTO,
      input: StorageProvisionFormValues,
    ) =>
      apiClient.storageProvisionsApi
        .updateStorageProvision({
          storageProvisionId: storageProvision.id,
          storageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => setStorageProvisions(resp.data.result)),
    [],
  )

  const handleDeleteStorageProvision = React.useCallback(
    (storageProvisionId: string) =>
      apiClient.storageProvisionsApi
        .deleteStorageProvision({
          storageProvisionId,
        })
        .then((resp) => {
          setStorageProvisions(resp.data.result)
        }),
    [],
  )

  React.useEffect(() => {
    void apiClient.storageProvisionsApi.listStorageProvisions().then((resp) => {
      setStorageProvisions(resp.data.result)
    })
  }, [])

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 sm:grid sm:grid-cols-8 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 sm:col-span-3">
            <span className="text-xl">Storage Provisions</span>
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Designate S3 locations that can be used to store your users' data.
            </div>
            <div className="pt-2 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              For example:
            </div>
            <div className="text-xs">
              <code className="mt-2 inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex-1">
                  <span>https://</span>
                  <span>&lt;endpoint&gt;</span>
                  <span>/</span>
                  <span>&lt;bucket&gt;</span>
                  <span>/</span>
                  <span>&lt;prefix&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;userId&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;folderId&gt;</span>
                  <span>/</span>
                  <span className=" ">.content</span>
                  <span>/</span>
                </span>
              </code>
              <code className="mt-2 inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex-1">
                  <span>https://</span>
                  <span>&lt;endpoint&gt;</span>
                  <span>/</span>
                  <span>&lt;bucket&gt;</span>
                  <span>/</span>
                  <span>&lt;prefix&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;userId&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;folderId&gt;</span>
                  <span>/</span>
                  <span className=" ">.metadata</span>
                  <span>/</span>
                </span>
              </code>
              <code className="mt-2 inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex-1">
                  <span>https://</span>
                  <span>&lt;endpoint&gt;</span>
                  <span>/</span>
                  <span>&lt;bucket&gt;</span>
                  <span>/</span>
                  <span>&lt;prefix&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;userId&gt;</span>
                  <span>/</span>
                  <span className="text-yellow-500">&lt;folderId&gt;</span>
                  <span>/</span>
                  <span className=" ">.backup</span>
                  <span>/</span>
                </span>
              </code>
            </div>
            <div className="pt-2 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Without entries here your users can only create folders by
              providing their own credentials to a working S3-compatible
              service.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-5 sm:mt-0">
            {editingStorageProvision ? (
              <StorageProvisionForm
                value={editingStorageProvision.storageProvision}
                titleText={
                  editingStorageProvision.mutationType === 'CREATE'
                    ? 'Create storage provision'
                    : 'Update storage provision'
                }
                onSubmit={(values) =>
                  (editingStorageProvision.mutationType === 'CREATE'
                    ? handleAddStorageProvision(values)
                    : handleUpdateStorageProvision(
                        editingStorageProvision.storageProvision as StorageProvisionDTO,
                        values,
                      )
                  ).then(() => setEditingStorageProvision(undefined))
                }
                submitText={
                  editingStorageProvision.mutationType === 'CREATE'
                    ? 'Create'
                    : 'Save'
                }
                onCancel={() => setEditingStorageProvision(undefined)}
              />
            ) : (storageProvisions?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4 items-start">
                <StorageProvisionTable
                  storageProvisions={storageProvisions ?? []}
                  onEdit={(storageProvision) =>
                    setEditingStorageProvision({
                      storageProvision,
                      mutationType: 'UPDATE',
                    })
                  }
                  onDelete={(storageProvision) =>
                    handleDeleteStorageProvision(storageProvision.id)
                  }
                />
                <Button
                  primary
                  icon={PlusCircleIcon}
                  onClick={() =>
                    setEditingStorageProvision({
                      storageProvision: undefined,
                      mutationType: 'CREATE',
                    })
                  }
                >
                  Add Storage Provision
                </Button>
              </div>
            ) : (
              <EmptyState
                buttonText="Add storage provision"
                icon={FolderIcon}
                text="No storage provisions have been created"
                onButtonPress={() =>
                  setEditingStorageProvision({
                    storageProvision: undefined,
                    mutationType: 'CREATE',
                  })
                }
              />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
