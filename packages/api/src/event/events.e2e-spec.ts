import { CORE_APP_IDENTIFIER, PLATFORM_IDENTIFIER } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestModule } from 'src/test/test.types'
import { buildTestModule } from 'src/test/test.util'

const TEST_MODULE_KEY = 'platform_events'

describe('Platform events', () => {
  let testModule: TestModule | undefined

  const resetTestState = async () => {
    await testModule?.resetAppState()
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
  })

  afterEach(async () => {
    await resetTestState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('creates tasks for apps subscribed to platform events', async () => {
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: PLATFORM_IDENTIFIER,
      eventIdentifier: 'worker_task_enqueued',
      data: {
        innerTaskId: 'abc-123',
        appIdentifier: 'demo-app',
        workerIdentifier: 'worker-1',
      },
    })

    const tasks =
      await testModule!.services.ormService.db.query.tasksTable.findMany({
        where: eq(tasksTable.taskIdentifier, 'run_worker_script'),
      })

    expect(tasks.length).toBe(1)
    const task = tasks[0]
    expect(task?.ownerIdentifier).toBe(CORE_APP_IDENTIFIER)
    expect(task?.data).toEqual({
      innerTaskId: 'abc-123',
      appIdentifier: 'demo-app',
      workerIdentifier: 'worker-1',
    })
  })
})
