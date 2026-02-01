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
  [CoreTaskName.SendEmailVerificationLink]: {
    description: 'Send email verification link to a newly signed-up user',
  },
  [CoreTaskName.CreateEventNotifications]: {
    description: 'Create notification records for an event or group of events',
  },
  [CoreTaskName.BuildNotificationDeliveries]: {
    description:
      'Create notification delivery records for a unique notification',
  },
  [CoreTaskName.SendNotificationEmails]: {
    description: 'Send batched notification emails to users',
  },
}

export const CORE_EVENT_TRIGGERS_TO_TASKS_MAP: Partial<
  Record<
    CoreEvent,
    {
      taskIdentifier: CoreTaskName
      buildData: (event: Event) => JsonSerializableObject
      condition?: (event: Event) => boolean
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
        folderId: event.targetLocationFolderId ?? null,
        objectKey: event.targetLocationObjectKey ?? null,
      }),
      buildTargetLocation: (event: Event) => ({
        folderId: event.targetLocationFolderId ?? null,
        objectKey: event.targetLocationFolderId
          ? (event.targetLocationObjectKey ?? null)
          : null,
      }),
    },
  ],
  [CoreEvent.new_user_registered]: [
    {
      taskIdentifier: CoreTaskName.SendEmailVerificationLink,
      buildData: (event: Event) => ({
        userId: event.data?.userId as string,
        userEmail: event.data?.userEmail as string,
      }),
      condition: (event: Event) => {
        return !!event.data?.userEmail && event.data.userEmailVerified === false
      },
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
