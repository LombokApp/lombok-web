import clsx from 'clsx'
import { EventDTO } from '@stellariscloud/api-client'
import { Card, CardContent } from '@stellariscloud/ui-toolkit'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'text-gray-500 dark:text-white'
const VALUE_TEXT_COLOR = 'text-black dark:text-white'

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
              Emitted By App
            </dt>
            <dd
              className={clsx(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {event ? (
                event.emitterIdentifier ? (
                  <span className="uppercase">{event.emitterIdentifier}</span>
                ) : (
                  <span className="italic opacity-50">None</span>
                )
              ) : (
                <span className="italic opacity-50">loading...</span>
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
                <pre>{JSON.stringify(event.data, null, 2)}</pre>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
