import type { JsonSerializableObject } from '@lombokapp/types'
import { PlatformEvent } from '@lombokapp/types'
import type { Event } from 'src/event/entities/event.entity'

import { PlatformTaskName } from '../task.constants'

export const PLATFORM_TASKS = {
  [PlatformTaskName.AnalyzeObject]: {
    description: 'Generate metadata and previews for an object',
  },
  [PlatformTaskName.ReindexFolder]: {
    description: 'Reindex a folder and its contents',
  },
  [PlatformTaskName.RunDockerWorker]: {
    description: 'Run a docker worker to execute a task',
  },
  [PlatformTaskName.RunServerlessWorker]: {
    description: 'Run a serverless worker to execute a task',
  },
}

export const PLATFORM_EVENT_TRIGGERS_TO_TASKS_MAP: Partial<
  Record<
    PlatformEvent,
    {
      taskIdentifier: PlatformTaskName
      buildData: (event: Event) => JsonSerializableObject
      buildTargetLocation?: (
        event: Event,
      ) => { folderId: string | null; objectKey: string | null } | null
    }[]
  >
> = {
  [PlatformEvent.object_added]: [
    {
      taskIdentifier: PlatformTaskName.AnalyzeObject,
      buildData: (event: Event) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        folderId: event.targetLocationFolderId!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        objectKey: event.targetLocationObjectKey!,
      }),
      buildTargetLocation: (event: Event) => ({
        folderId: event.targetLocationFolderId ?? null,
        objectKey: event.targetLocationFolderId
          ? (event.targetLocationObjectKey ?? null)
          : null,
      }),
    },
  ],
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
