import { TaskHandler } from '@lombokapp/app-worker-sdk'

export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  console.log('From inside scheduled worker:', {
    taskDetails: task,
    envVars: process.env,
  })
}
