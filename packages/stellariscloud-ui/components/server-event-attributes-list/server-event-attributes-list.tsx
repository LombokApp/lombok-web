import clsx from 'clsx'
import { EventDTO } from '@stellariscloud/api-client'
import { Card, CardContent, cn } from '@stellariscloud/ui-toolkit'
import { invertColour, stringToColour } from '../../utils/colors'
import Image from 'next/image'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import Link from 'next/link'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'opacity/50'
const VALUE_TEXT_COLOR = ''

export function ServerEventAttributesList({ event }: { event?: EventDTO }) {
  return (
    <Card>
      <CardContent>
        <dl className="divide-y divide-white/10">
          <div
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Event Type
            </dt>
            <dd
              className={clsx(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.eventKey}
            </dd>
          </div>
          <div
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Emitted By
            </dt>
            <dd
              className={clsx(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.emitterIdentifier && (
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
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
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Timestamp
            </dt>
            <dd
              className={clsx(
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
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Level
            </dt>
            <dd
              className={clsx(
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
                  {event?.level}
                </div>
              )}
            </dd>
          </div>
          <div
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Folder / Object
            </dt>
            <dd
              className={clsx(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event?.locationContext?.folderId}{' '}
              {event?.locationContext?.objectKey &&
                ` - ${event?.locationContext?.objectKey}`}
            </dd>
          </div>
          <div
            className={clsx(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={clsx(
                'text-sm font-medium leading-6',
                LABEL_TEXT_COLOR,
              )}
            >
              Data
            </dt>
            <dd
              className={clsx(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {typeof event === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : (
                <div className="bg-background/50 p-4 rounded-lg">
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
