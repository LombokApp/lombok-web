import { Button } from '@stellariscloud/ui-toolkit'
import { Globe, Key, Lock, PackageOpen, Server, Slash } from 'lucide-react'

import type { ServerStorageLocationDTO } from '@/src/services/api'

const DD_CLASS = 'mt-1 text-base text-muted-foreground font-mono'

export function ServerStorageLocationCard({
  serverStorageLocation,
  onRemoveClick,
}: {
  serverStorageLocation: ServerStorageLocationDTO
  onRemoveClick: () => void
}) {
  return (
    <div className="lg:col-start-3 lg:row-end-1">
      <h2 className="sr-only">Server Storage Location Description</h2>
      <div className="rounded-md bg-muted-foreground/[.02] shadow-sm ring-1 ring-gray-900/5">
        <dl className="grid grid-cols-2">
          <div className="flex flex-col pl-6 pt-6">
            <span className="sr-only">Endpoint</span>
            <dt className="flex gap-2">
              <Server
                aria-hidden="true"
                className="h-6 w-5 text-muted-foreground"
              />
              <div className="text-sm/6 font-semibold">Endpoint</div>
            </dt>
            <dd className={DD_CLASS}>{serverStorageLocation.endpoint}</dd>
          </div>
          <div className="flex flex-col pl-6 pt-6">
            <dt className="flex gap-2">
              <span className="sr-only">Region</span>
              <div className="flex gap-2">
                <Globe
                  aria-hidden="true"
                  className="h-6 w-5 text-muted-foreground"
                />
                <div className="text-sm/6 font-semibold">Region</div>
              </div>
            </dt>
            <dd className={DD_CLASS}>
              {serverStorageLocation.region ? (
                serverStorageLocation.region
              ) : (
                <span className="italic text-muted-foreground/50">auto</span>
              )}
            </dd>
          </div>
        </dl>
        <dl className="grid grid-cols-2">
          <div className="flex flex-col pl-6 pt-6">
            <span className="sr-only">Access Key ID</span>
            <dt className="flex gap-2">
              <Key
                aria-hidden="true"
                className="h-6 w-5 text-muted-foreground"
              />
              <div className="text-sm/6 font-semibold">Access Key ID</div>
            </dt>
            <dd className={DD_CLASS}>{serverStorageLocation.accessKeyId}</dd>
          </div>
          <div className="flex flex-col pl-6 pt-6">
            <dt className="flex gap-2">
              <span className="sr-only">Secret Access Key</span>
              <div className="flex gap-2">
                <Lock
                  aria-hidden="true"
                  className="h-6 w-5 text-muted-foreground"
                />
                <div className="text-sm/6 font-semibold">Secret Access Key</div>
              </div>
            </dt>
            <dd className={DD_CLASS}>
              <span className="italic text-muted-foreground/50">*********</span>
            </dd>
          </div>
        </dl>
        <dl className="grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col pl-6 pt-6">
            <span className="sr-only">Bucket</span>
            <dt className="flex gap-2">
              <PackageOpen
                aria-hidden="true"
                className="h-6 w-5 text-muted-foreground"
              />
              <div className="text-sm/6 font-semibold">Bucket</div>
            </dt>
            <dd className={DD_CLASS}>{serverStorageLocation.bucket}</dd>
          </div>
          <div className="flex flex-col pl-6 pt-6">
            <dt className="flex gap-2">
              <span className="sr-only">Prefix</span>
              <div className="flex gap-2">
                <Slash
                  aria-hidden="true"
                  className="h-6 w-5 text-muted-foreground"
                />
                <div className="text-sm/6 font-semibold">Prefix</div>
              </div>
            </dt>
            <dd className={DD_CLASS}>
              {serverStorageLocation.prefix ? (
                serverStorageLocation.prefix
              ) : (
                <span className="italic text-muted-foreground/50">none</span>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-gray-900/5 p-6">
          <Button onClick={onRemoveClick} variant="destructive">
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
