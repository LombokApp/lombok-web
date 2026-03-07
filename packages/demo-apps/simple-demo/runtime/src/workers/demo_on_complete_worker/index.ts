import { type TaskHandler } from '@lombokapp/app-worker-sdk'

// eslint-disable-next-line @typescript-eslint/require-await
export const handleTask: TaskHandler = async function handleTask(task) {
  console.log('From within on complete worker:', {
    task,
  })
}
