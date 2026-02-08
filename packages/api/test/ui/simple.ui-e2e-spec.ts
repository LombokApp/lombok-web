import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_simple'

describe('UI E2E - Simple buildTestModule test', () => {
  let testModule: UITestModule | undefined

  beforeAll(async () => {
    console.log('Building test module directly...')
    testModule = await buildUITestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
  })

  afterAll(async () => {
    if (testModule) {
      await testModule.shutdown()
    }
  })

  it('should successfully build test module', () => {
    expect(testModule).toBeTruthy()
    expect(testModule?.app).toBeTruthy()
  })
})
