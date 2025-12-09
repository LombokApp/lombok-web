import type { TaskHandler } from '@lombokapp/app-worker-sdk'

// eslint-disable-next-line @typescript-eslint/require-await
export const handleTask: TaskHandler = async function handleTask(
  task,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { serverClient },
) {
  console.log('From inside scheduled worker:', {
    taskDetails: task,
    envVars: process.env,
  })
}
