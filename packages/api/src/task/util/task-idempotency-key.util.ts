import type { JsonSerializableObject, TaskInvocation } from '@lombokapp/types'
import { hashData } from 'src/platform/utils/crypto.util'

import type { NewTask } from '../entities/task.entity'

const IDEMPOTENCY_KEY_VERSION = 'v1'
type TaskIdempotencyKeyInput = Omit<NewTask, 'idempotencyKey'>

const buildTriggerIdempotencyData = (
  task: TaskIdempotencyKeyInput,
  trigger: TaskInvocation,
): JsonSerializableObject => {
  switch (trigger.kind) {
    case 'event':
      return {
        eventIdentifier: trigger.invokeContext.emitterIdentifier,
        emittedIdentifier: trigger.invokeContext.eventIdentifier,
        eventId: trigger.invokeContext.eventId,
        eventTriggerConfigIndex: trigger.invokeContext.eventTriggerConfigIndex,
      }
    case 'schedule':
      return {
        name: trigger.invokeContext.name,
        config: trigger.invokeContext.config,
        timestampBucket: trigger.invokeContext.timestampBucket,
      }
    case 'user_action':
      return {
        requestId: trigger.invokeContext.requestId,
      }
    case 'app_action':
      return { requestId: trigger.invokeContext.requestId }
    case 'task_child':
      return {
        parentTaskId: trigger.invokeContext.parentTask.id,
        onCompleteHandlerIndex: trigger.invokeContext.onCompleteHandlerIndex,
      }
  }
}

export const buildTaskIdempotencyKey = (
  input: TaskIdempotencyKeyInput,
): string => {
  const payload = {
    ownerIdentifier: input.ownerIdentifier,
    taskIdentifier: input.taskIdentifier,
    triggerData: buildTriggerIdempotencyData(input, input.trigger),
  }
  const serialized = JSON.stringify(payload)
  const hash = hashData(Buffer.from(serialized, 'utf8'))
  return `task:${IDEMPOTENCY_KEY_VERSION}:${input.trigger.kind}:${hash}`
}

export const withTaskIdempotencyKey = (
  task: TaskIdempotencyKeyInput,
): NewTask => ({
  ...task,
  idempotencyKey: buildTaskIdempotencyKey(task),
})
