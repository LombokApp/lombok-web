import type { TaskDTO } from '@stellariscloud/types'
import { Card, CardContent, cn } from '@stellariscloud/ui-toolkit'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { Link } from 'react-router-dom'

import { invertColour, stringToColour } from '../../utils/colors'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'opacity/50'
const VALUE_TEXT_COLOR = ''

export function ServerTaskAttributesList({ task }: { task?: TaskDTO }) {
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
              Task Type
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {task?.taskKey}
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
              {task?.ownerIdentifier && (
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-8 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      background: task.ownerIdentifier.includes(':')
                        ? stringToColour(
                            task.ownerIdentifier.split(':')[1] ?? '',
                          )
                        : '',
                      color: task.ownerIdentifier.includes(':')
                        ? invertColour(
                            stringToColour(
                              task.ownerIdentifier.split(':')[1] ?? '',
                            ),
                          )
                        : undefined,
                    }}
                  >
                    {task.ownerIdentifier === 'core' ? (
                      <img
                        width={30}
                        height={30}
                        alt="Core"
                        src="/stellariscloud.png"
                      />
                    ) : (
                      <span className="uppercase">
                        {task.ownerIdentifier.split(':')[1]?.[0] ?? ''}
                      </span>
                    )}
                  </div>
                  <div>
                    {task.ownerIdentifier.startsWith('app:') ? (
                      <Link
                        className="underline"
                        to={`/server/apps/${task.ownerIdentifier.slice('app:'.length)}`}
                      >
                        {task.ownerIdentifier}
                      </Link>
                    ) : (
                      task.ownerIdentifier
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
              {task?.createdAt && (
                <div className="flex flex-col">
                  <div>{new Date(task.createdAt).toLocaleString()}</div>
                  <div className="text-xs">
                    {timeSinceOrUntil(new Date(task.createdAt))}
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
              Status
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {task && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'size-2 rounded-full',
                        task.completedAt
                          ? 'bg-green-600'
                          : task.errorAt
                            ? 'bg-red-600'
                            : !task.startedAt
                              ? 'bg-gray-600'
                              : 'bg-yellow-600',
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    {task.completedAt
                      ? 'Complete'
                      : task.errorAt
                        ? 'Failed'
                        : !task.startedAt
                          ? 'Pending'
                          : 'Running'}

                    {task.errorAt ? (
                      <div>
                        {JSON.stringify(
                          {
                            code: task.errorCode,
                            message: task.errorMessage,
                          },
                          null,
                          2,
                        )}
                      </div>
                    ) : null}
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
              Input Data
            </dt>
            <dd
              className={cn(
                'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
                VALUE_TEXT_COLOR,
              )}
            >
              {task && (
                <div className="rounded-lg bg-background/50 p-4">
                  <pre>{JSON.stringify(task.inputData, null, 2)}</pre>
                </div>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
