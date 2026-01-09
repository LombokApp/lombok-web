import type { JsonSerializableObject } from '@lombokapp/types'
import { CoreEvent } from '@lombokapp/types'
import type { Event } from 'src/event/entities/event.entity'

import { CoreTaskName } from '../task.constants'

export const CORE_TASKS = {
  [CoreTaskName.AnalyzeObject]: {
    description: 'Generate metadata and previews for an object',
  },
  [CoreTaskName.ReindexFolder]: {
    description: 'Reindex a folder and its contents',
  },
  [CoreTaskName.RunDockerWorker]: {
    description: 'Run a docker worker to execute a task',
  },
  [CoreTaskName.RunServerlessWorker]: {
    description: 'Run a serverless worker to execute a task',
  },
}

export const CORE_EVENT_TRIGGERS_TO_TASKS_MAP: Partial<
  Record<
    CoreEvent,
    {
      taskIdentifier: CoreTaskName
      buildData: (event: Event) => JsonSerializableObject
      buildTargetLocation?: (
        event: Event,
      ) => { folderId: string | null; objectKey: string | null } | null
      calculateDontStartBefore?: (event: Event) => Date | undefined
    }[]
  >
> = {
  [CoreEvent.object_added]: [
    {
      taskIdentifier: CoreTaskName.AnalyzeObject,
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
  [CoreEvent.docker_task_enqueued]: [
    {
      taskIdentifier: CoreTaskName.RunDockerWorker,
      buildData: (event: Event) => ({
        innerTaskId: event.data?.innerTaskId ?? null,
        appIdentifier: event.data?.appIdentifier ?? null,
        profileIdentifier: event.data?.profileIdentifier ?? null,
        jobClassIdentifier: event.data?.jobClassIdentifier ?? null,
      }),
      calculateDontStartBefore: (event: Event) => {
        const dontStartBefore =
          typeof event.data?.dontStartBefore === 'string'
            ? new Date(event.data.dontStartBefore)
            : undefined
        return dontStartBefore
      },
    },
  ],
  [CoreEvent.serverless_task_enqueued]: [
    {
      taskIdentifier: CoreTaskName.RunServerlessWorker,
      buildData: (event: Event) => ({
        innerTaskId: event.data?.innerTaskId ?? null,
        appIdentifier: event.data?.appIdentifier ?? null,
        workerIdentifier: event.data?.workerIdentifier ?? null,
      }),
      calculateDontStartBefore: (event: Event) => {
        const dontStartBefore =
          typeof event.data?.dontStartBefore === 'string'
            ? new Date(event.data.dontStartBefore)
            : undefined
        return dontStartBefore
      },
    },
  ],
}
