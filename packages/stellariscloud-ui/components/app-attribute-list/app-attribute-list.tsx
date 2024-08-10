import clsx from 'clsx'
import { Badge } from '../../design-system/badge/badge'
import { AppDTO } from '@stellariscloud/api-client'

const LABEL_TEXT_COLOR = 'text-gray-500 dark:text-white'
const VALUE_TEXT_COLOR = 'text-black dark:text-white'
const ROW_SPACING = 'px-4 py-3'

export function AppAttributeList({ app }: { app?: AppDTO }) {
  return (
    <div className="bg-gray-200 dark:bg-transparent rounded-lg dark:rounded-none px-4">
      <dl className="divide-y divide-white/10">
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Identifier
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {app?.identifier ? (
              app.identifier
            ) : (
              <span className="italic opacity-50">None</span>
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
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Description
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {app?.config.description}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Emit Events
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            <div className="flex flex-wrap gap-2">
              {typeof app === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : !app.config.emitEvents.length ? (
                <span className="italic opacity-50">None</span>
              ) : (
                app.config.emitEvents.map((emitEvent, i) => (
                  <Badge style="info" key={i} size="sm">
                    {emitEvent}
                  </Badge>
                ))
              )}
            </div>
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Subscribed Events
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            <div className="flex flex-wrap gap-2">
              {typeof app === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : !app.config.subscribedEvents.length ? (
                <span className="italic opacity-50">None</span>
              ) : (
                app.config.subscribedEvents.map((subscribedEvent, i) => (
                  <Badge style="info" key={i} size="sm">
                    {subscribedEvent}
                  </Badge>
                ))
              )}
            </div>
          </dd>
        </div>
      </dl>
    </div>
  )
}
