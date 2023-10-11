import {
  ExclamationTriangleIcon,
  FolderIcon,
  GlobeAltIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusSmallIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { ServerLocationData } from '@stellariscloud/api-client'
import { ServerLocationType } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { Icon } from '../../../design-system/icon'
import { Table } from '../../../design-system/table/table'
import { serverApi } from '../../../services/api'
import { EmptyServerLocation } from './empty-server-location'
import type { LocationFormValues } from './location-form'
import { LocationForm } from './location-form'

export function StorageBackendTable({
  locations,
  onEdit,
}: {
  locations: ServerLocationData[]
  onEdit: (l: ServerLocationData) => void
}) {
  return (
    <Table
      headers={[
        'Server',
        { label: 'Location', cellStyles: 'w-[99%]' },
        'Actions',
      ]}
      rows={locations.map((location, i) => [
        <div key={i} className="flex flex-col gap-1">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {location.name}
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
                  size="xs"
                />
                <span>{location.accessKeyId}</span>
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
                  size="xs"
                />
                <span>{location.region}</span>
              </div>
            </span>
          </div>
        </div>,
        <div key={i} className="flex flex-col items-start">
          <div className="flex gap-2">
            <div>
              <span className="opacity-70 dark:opacity-50">Endpoint: </span>
              <span className="font-semibold">{location.endpoint}</span>
            </div>
          </div>
          <div>
            <span className="opacity-70 dark:opacity-50">Bucket: </span>
            <span className="font-semibold">{location.bucket}</span>
          </div>
          {location.prefix && (
            <div>
              <span className="opacity-70 dark:opacity-50">Prefix: </span>
              <span className="font-semibold">{location.prefix}</span>
            </div>
          )}
        </div>,
        <div key={i} className="flex gap-2">
          <ButtonGroup
            buttons={[
              {
                name: '',
                icon: PencilSquareIcon,
                onClick: () => onEdit(location),
              },
              {
                name: '',
                icon: TrashIcon,
                onClick: () => onEdit(location),
              },
            ]}
          />
        </div>,
      ])}
    />
  )
}

export function ServerStorageConfig() {
  const [s3Locations, setServerS3Locations] = React.useState<{
    [ServerLocationType.Backup]: ServerLocationData[]
    [ServerLocationType.Metadata]: ServerLocationData[]
    [ServerLocationType.Content]: ServerLocationData[]
  }>({
    [ServerLocationType.Backup]: [],
    [ServerLocationType.Metadata]: [],
    [ServerLocationType.Content]: [],
  })

  const [editingLocation, setEditingLocation] = React.useState<
    Partial<{
      location: ServerLocationData
      mutationType: 'CREATE' | 'UPDATE'
      locationType: ServerLocationType
    }>
  >()

  const handleAddServerLocation = React.useCallback(
    (type: ServerLocationType, input: LocationFormValues) => {
      return serverApi
        .addServerLocation({
          locationType: type,
          serverLocationInputData: {
            ...input,
          },
        })
        .then((resp) => {
          setServerS3Locations((locations) => ({
            ...locations,
            [type]: locations[type].concat([resp.data]),
          }))
        })
    },
    [],
  )

  React.useEffect(() => {
    for (const k of [
      ServerLocationType.Backup,
      ServerLocationType.Metadata,
      ServerLocationType.Content,
    ]) {
      void serverApi.listServerLocations({ locationType: k }).then((resp) => {
        setServerS3Locations((locations) => ({
          ...locations,
          [k]: resp.data,
        }))
      })
    }
  }, [])

  return (
    <div className="">
      <div className="">
        <dl className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
              User Metadata Provisions
              <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                Users folders can optionally be provisioned with metadata
                storage backends from these locations.
              </div>
              <code className="mt-2 text-sm sm:text-base inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex gap-4">
                  <span className="flex-1">
                    <span>https://</span>
                    <span>&lt;endpoint&gt;</span>
                    <span>/</span>
                    <span>&lt;bucket&gt;</span>
                    <span>/</span>
                    <span>&lt;prefix&gt;</span>
                    <span>/</span>
                    <span className="text-yellow-500">&lt;folderId&gt;</span>
                  </span>
                </span>
              </code>
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {editingLocation?.locationType === ServerLocationType.Metadata ? (
                <LocationForm
                  value={editingLocation.location}
                  titleText={
                    editingLocation.mutationType === 'CREATE'
                      ? 'Create location'
                      : 'Update location'
                  }
                  onSubmit={(values) =>
                    void handleAddServerLocation(
                      ServerLocationType.Metadata,
                      values,
                    ).then(() => setEditingLocation({}))
                  }
                  onCancel={() =>
                    setEditingLocation({
                      location: undefined,
                      mutationType: 'CREATE',
                      locationType: undefined,
                    })
                  }
                />
              ) : s3Locations.USER_METADATA.length > 0 ? (
                <div className="flex flex-col items-start">
                  <StorageBackendTable
                    locations={s3Locations.USER_METADATA}
                    onEdit={(location) =>
                      setEditingLocation({
                        location,
                        locationType: ServerLocationType.Metadata,
                        mutationType: 'UPDATE',
                      })
                    }
                  />
                  <Button
                    primary
                    icon={PlusSmallIcon}
                    onClick={() => {
                      setEditingLocation({
                        location: undefined,
                        mutationType: 'CREATE',
                        locationType: ServerLocationType.Metadata,
                      })
                    }}
                    className="grow-0"
                  >
                    Add Metadata Location
                  </Button>
                </div>
              ) : (
                <EmptyServerLocation
                  buttonText="Set metadata location"
                  icon={ExclamationTriangleIcon}
                  text="No metadata location set"
                  onCreate={() =>
                    setEditingLocation({
                      location: undefined,
                      mutationType: 'CREATE',
                      locationType: ServerLocationType.Metadata,
                    })
                  }
                />
              )}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
              User Content Provisions
              <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                Users folders can optionally be provisioned with content storage
                backends from these locations.
              </div>
              <code className="mt-2 text-sm sm:text-base inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex gap-4">
                  <span className="flex-1">
                    <span>https://</span>
                    <span>&lt;endpoint&gt;</span>
                    <span>/</span>
                    <span>&lt;bucket&gt;</span>
                    <span>/</span>
                    <span>&lt;prefix&gt;</span>
                    <span>/</span>
                    <span className="text-yellow-500">&lt;folderId&gt;</span>
                  </span>
                </span>
              </code>
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {editingLocation?.locationType === ServerLocationType.Content ? (
                <LocationForm
                  value={editingLocation.location}
                  titleText={
                    editingLocation.mutationType === 'CREATE'
                      ? 'Create location'
                      : 'Update location'
                  }
                  onSubmit={(values) =>
                    void handleAddServerLocation(
                      ServerLocationType.Content,
                      values,
                    ).then(() => setEditingLocation({}))
                  }
                  onCancel={() => setEditingLocation({})}
                />
              ) : s3Locations.USER_CONTENT.length > 0 ? (
                <div className="flex flex-col gap-4 items-start">
                  <StorageBackendTable
                    locations={s3Locations.USER_CONTENT}
                    onEdit={(location) =>
                      setEditingLocation({
                        location,
                        locationType: ServerLocationType.Content,
                        mutationType: 'UPDATE',
                      })
                    }
                  />
                  <Button
                    primary
                    icon={PlusSmallIcon}
                    onClick={() =>
                      setEditingLocation({
                        location: undefined,
                        mutationType: 'CREATE',
                        locationType: ServerLocationType.Content,
                      })
                    }
                  >
                    Add Content Location
                  </Button>
                </div>
              ) : (
                <EmptyServerLocation
                  buttonText="Add user folder location"
                  icon={FolderIcon}
                  text="No user folder locations set"
                  onCreate={() =>
                    setEditingLocation({
                      location: undefined,
                      mutationType: 'CREATE',
                      locationType: ServerLocationType.Content,
                    })
                  }
                />
              )}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
              Backup Locations
              <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                Redundant backups for a user's folders are persisted to one or
                more of these locations. If you want to offer your users
                redundancy for their data, then you should use at least one
                location here.
              </div>
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {editingLocation?.locationType === ServerLocationType.Backup ? (
                <LocationForm
                  value={editingLocation.location}
                  titleText={
                    editingLocation.mutationType === 'CREATE'
                      ? 'Create location'
                      : 'Update location'
                  }
                  onSubmit={(values) =>
                    void handleAddServerLocation(
                      ServerLocationType.Backup,
                      values,
                    ).then(() => setEditingLocation({}))
                  }
                  onCancel={() => setEditingLocation({})}
                />
              ) : s3Locations.USER_BACKUP.length ? (
                <div className="flex flex-col gap-4 items-start">
                  <StorageBackendTable
                    locations={s3Locations.USER_BACKUP}
                    onEdit={(location) =>
                      setEditingLocation({
                        location,
                        locationType: ServerLocationType.Backup,
                        mutationType: 'UPDATE',
                      })
                    }
                  />

                  <Button
                    primary
                    icon={PlusSmallIcon}
                    onClick={() =>
                      setEditingLocation(() => ({
                        location: undefined,
                        mutationType: 'CREATE',
                        locationType: ServerLocationType.Backup,
                      }))
                    }
                  >
                    Add Backup Location
                  </Button>
                </div>
              ) : (
                <EmptyServerLocation
                  buttonText="Add backup location"
                  icon={FolderIcon}
                  text="No backup locations set"
                  onCreate={() => {
                    setEditingLocation({
                      location: undefined,
                      mutationType: 'CREATE',
                      locationType: ServerLocationType.Backup,
                    })
                  }}
                />
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
