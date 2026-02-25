import type { TaskHandler } from '@lombokapp/app-worker-sdk'

const TASK_LABELS = [
  'Analysing data',
  'Processing records',
  'Generating report',
  'Optimising index',
  'Computing metrics',
]

/**
 * A demo task handler that simulates multi-step async work by emitting
 * progress updates over time. Each task picks a random label and step count,
 * then emits incremental progress updates with short delays between steps.
 */
export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  const steps = 4 + Math.floor(Math.random() * 4) // 4-7 steps
  const label =
    (task.data as { label?: string } | undefined)?.label ??
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    TASK_LABELS[Math.floor(Math.random() * TASK_LABELS.length)]!

  for (let i = 1; i <= steps; i++) {
    // Simulate work with a random delay (300-800ms)
    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 500),
    )

    await serverClient.reportTaskUpdate({
      taskId: task.id,
      update: {
        progress: {
          percent: Math.round((i / steps) * 100),
          current: i,
          total: steps,
          label,
        },
        message: {
          level: 'info',
          text: `${label}: step ${i}/${steps}`,
          audience: 'user',
        },
      },
    })
  }
}
