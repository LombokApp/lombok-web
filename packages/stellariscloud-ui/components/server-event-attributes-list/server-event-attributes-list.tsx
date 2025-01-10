import type { EventDTO } from '@stellariscloud/api-client'
import { Card, CardContent, cn } from '@stellariscloud/ui-toolkit'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import Image from 'next/image'
import Link from 'next/link'

import { invertColour, stringToColour } from '../../utils/colors'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'opacity/50'
const VALUE_TEXT_COLOR = ''

export function ServerEventAttributesList({ event }: { event?: EventDTO }) {
  return (
    <Card>
      <CardContent>
        <dl className="divide-y divide-white/10">
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Event Type
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.eventKey}
            </dd>
          </div>
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Emitted By
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.emitterIdentifier && (
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-8 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      background: stringToColour(event.emitterIdentifier),
                      color: invertColour(
                        stringToColour(event.emitterIdentifier),
                      ),
                    }}
                  >
                    {event.emitterIdentifier === 'CORE' ? (
                      <Image
                        width={30}
                        height={30}
                        alt="Core"
                        src="/stellariscloud.png"
                      />
                    ) : (
                      <span className="uppercase">
                        {event.emitterIdentifier.split(':')[1][0]}
                      </span>
                    )}
                  </div>
                  <div>
                    {event.emitterIdentifier.startsWith('APP:') ? (
                      <Link
                        className="underline"
                        href={`/server/apps/${event.emitterIdentifier.slice('APP:'.length).toLowerCase()}`}
                      >
                        {event.emitterIdentifier}
                      </Link>
                    ) : (
                      event.emitterIdentifier
                    )}
                  </div>
                </div>
              )}
            </dd>
          </div>
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Timestamp
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.createdAt && (
                <div className="flex flex-col">
                  <div>{new Date(event.createdAt).toLocaleString()}</div>
                  <div className="text-xs">
                    {timeSinceOrUntil(new Date(event.createdAt))}
                  </div>
                </div>
              )}
            </dd>
          </div>
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Level
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'rounded-full w-2 h-2',
                      event.level === 'INFO'
                        ? 'bg-blue-500'
                        : event.level === 'ERROR'
                          ? 'bg-red-500'
                          : event.level === 'WARN'
                            ? 'bg-amber-500'
                            : event.level === 'DEBUG'
                              ? 'bg-neutral-500'
                              : 'bg-slate-500',
                    )}
                  />
                  {event.level}
                </div>
              )}
            </dd>
          </div>
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Folder / Object
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.locationContext?.folderId}{' '}
              {event?.locationContext?.objectKey &&
                ` - ${event.locationContext.objectKey}`}
            </dd>
          </div>
          <div
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Data
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {typeof event === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : (
                <div className="rounded-lg bg-background/50 p-4">
                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                </div>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
