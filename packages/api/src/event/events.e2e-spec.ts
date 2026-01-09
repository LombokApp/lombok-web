import { CORE_IDENTIFIER } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestModule } from 'src/test/test.types'
import { buildTestModule } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'core_events'

describe('Core Events', () => {
  let testModule: TestModule | undefined

  const resetTestState = async () => {
    await testModule?.resetAppState()
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
  })

  afterEach(async () => {
    await resetTestState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('creates tasks for apps subscribed to core events', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])

    const data = {
      folderId: crypto.randomUUID(),
      objectKey: crypto.randomUUID(),
    }
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: CORE_IDENTIFIER,
      eventIdentifier: 'object_added',
      data,
    })

    const tasks =
      await testModule!.services.ormService.db.query.tasksTable.findMany({
        where: eq(tasksTable.taskIdentifier, 'minimal_worker_task'),
      })

    expect(tasks.length).toBe(1)
    const task = tasks[0]
    expect(task?.ownerIdentifier).toBe(
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG),
    )
    expect(task?.data).toEqual(data)
  })
})
