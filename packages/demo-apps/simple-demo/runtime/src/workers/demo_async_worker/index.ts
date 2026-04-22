import type { TaskHandler } from '@lombokapp/app-worker-sdk'
import { TaskProgressMessageLevel } from '@lombokapp/types'

export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  const steps = [
    'Initializing',
    'Fetching data',
    'Processing results',
    'Finalizing',
  ]

  for (let i = 0; i < steps.length; i++) {
    await serverClient.reportTaskProgress({
      taskId: task.id,
      progressReport: {
        details: {
          percent: Math.round(((i + 1) / steps.length) * 100),
          current: i + 1,
          total: steps.length,
          label: steps[i],
        },
        message: {
          level: TaskProgressMessageLevel.info,
          text: `Step ${i + 1}/${steps.length}: ${steps[i]}`,
          audience: 'user',
        },
      },
    })

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}
