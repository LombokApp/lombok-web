import type { JsonSerializableObject } from '@lombokapp/types'
import { PlatformEvent } from '@lombokapp/types'
import type { Event } from 'src/event/entities/event.entity'

import { PlatformTaskName } from '../task.constants'

export const PLATFORM_TASKS = {
  [PlatformTaskName.ReindexFolder]: {
    description: 'Reindex a folder and its contents',
  },
  [PlatformTaskName.RunDockerWorker]: {
    description: 'Run a docker job to execute a docker handled task',
  },
  [PlatformTaskName.RunServerlessWorker]: {
    description: 'Run a serverless worker task',
  },
}

export const PLATFORM_EVENT_TRIGGERS_TO_TASKS_MAP: Partial<
  Record<
    PlatformEvent,
    {
      taskIdentifier: PlatformTaskName
      buildData: (event: Event) => JsonSerializableObject
    }[]
  >
> = {
  [PlatformEvent.docker_task_enqueued]: [
    {
      taskIdentifier: PlatformTaskName.RunDockerWorker,
      buildData: (event: Event) => ({
        innerTaskId: event.data?.innerTaskId ?? null,
        appIdentifier: event.data?.appIdentifier ?? null,
        profileIdentifier: event.data?.profileIdentifier ?? null,
        jobClassIdentifier: event.data?.jobClassIdentifier ?? null,
      }),
    },
  ],
  [PlatformEvent.serverless_task_enqueued]: [
    {
      taskIdentifier: PlatformTaskName.RunServerlessWorker,
      buildData: (event: Event) => ({
        innerTaskId: event.data?.innerTaskId ?? null,
        appIdentifier: event.data?.appIdentifier ?? null,
        workerIdentifier: event.data?.workerIdentifier ?? null,
      }),
    },
  ],
}
