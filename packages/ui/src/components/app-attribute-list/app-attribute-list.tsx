import type { AppDTO } from '@stellariscloud/api-client'
import { Badge, Card, CardContent, cn } from '@stellariscloud/ui-toolkit'

const LABEL_TEXT_COLOR = 'opacity-50'
const VALUE_TEXT_COLOR = ''
const ROW_SPACING = 'px-4 py-3'

export function AppAttributeList({ app }: { app?: AppDTO }) {
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
              Identifier
            </dt>
            <dd
              className={cn(
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
            className={cn(
              'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
              ROW_SPACING,
            )}
          >
            <dt
              className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
            >
              Description
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {app?.config.description}
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
              Public Key
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              <pre className="overflow-x-auto rounded-md bg-foreground/5 p-4 py-2">
                {app?.publicKey}
              </pre>
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
              Emit Events
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              <div className="flex flex-wrap gap-2">
                {typeof app === 'undefined' ? (
                  <span className="italic opacity-50">Unknown</span>
                ) : !app.config.emittableEvents.length ? (
                  <span className="italic opacity-50">None</span>
                ) : (
                  app.config.emittableEvents.map((emitEvent, i) => (
                    <Badge variant={'outline'} key={i}>
                      {emitEvent}
                    </Badge>
                  ))
                )}
              </div>
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
              Tasks
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              <div className="flex flex-wrap gap-2">
                {typeof app === 'undefined' ? (
                  <span className="italic opacity-50">Unknown</span>
                ) : !app.config.tasks.length ? (
                  <span className="italic opacity-50">None</span>
                ) : (
                  app.config.tasks.map((task, i) => (
                    <Badge variant={'outline'} key={i}>
                      {task.key}
                    </Badge>
                  ))
                )}
              </div>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
