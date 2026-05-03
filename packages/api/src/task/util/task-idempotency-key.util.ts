import type { JsonSerializableObject, TaskInvocation } from '@lombokapp/types'
import { hashData } from 'src/core/utils/crypto.util'

import type { NewTask } from '../entities/task.entity'

type TaskIdempotencyKeyInput = Omit<NewTask, 'idempotencyKey'>

const buildTriggerIdempotencyData = (
  trigger: TaskInvocation,
): JsonSerializableObject => {
  switch (trigger.kind) {
    case 'system_action':
      return (
        trigger.invokeContext.idempotencyData ?? {
          requestId: crypto.randomUUID(),
        }
      )
    case 'event':
      return {
        eventIdentifier: trigger.invokeContext.eventIdentifier,
        emitterIdentifier: trigger.invokeContext.emitterIdentifier,
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
    case 'task_complete_child':
      return {
        parentTaskId: trigger.invokeContext.parentTask.id,
        onCompleteHandlerIndex: trigger.invokeContext.onCompleteHandlerIndex,
      }
    case 'task_progress_child':
      return {
        parentTaskId: trigger.invokeContext.parentTask.id,
        onProgressHandlerIndex: trigger.invokeContext.onProgressHandlerIndex,
        // include progressReport timestamp/code so repeated identical
        // reports produce distinct child tasks rather than collide on
        // the idempotency key
        progressReportCode:
          trigger.invokeContext.parentTask.progressReport.code ?? null,
        progressReportTimestamp:
          trigger.invokeContext.parentTask.progressReport.timestamp ?? null,
      }
  }
}

export const buildTaskIdempotencyKey = (
  input: TaskIdempotencyKeyInput,
): string => {
  const payload = {
    ownerIdentifier: input.ownerIdentifier,
    taskIdentifier: input.taskIdentifier,
    triggerData: buildTriggerIdempotencyData(input.invocation),
  }
  const serialized = JSON.stringify(payload)
  const hash = hashData(Buffer.from(serialized, 'utf8'))
  return `${input.invocation.kind}:${hash}`
}

export const withTaskIdempotencyKey = (
  task: TaskIdempotencyKeyInput,
): NewTask => ({
  ...task,
  idempotencyKey: buildTaskIdempotencyKey(task),
})
