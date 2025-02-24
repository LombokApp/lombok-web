import {
  AppTask,
  CoreServerMessageInterface,
} from '@stellariscloud/core-worker'

export const dummyTaskHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  console.log('EXECUTING DUMMY WORKER SCRIPT. TASK:', task)
}
