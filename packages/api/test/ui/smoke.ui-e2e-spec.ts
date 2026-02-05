import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_smoke'

describe('UI E2E - Smoke Test', () => {
  let testModule: UITestModule | undefined

  beforeAll(async () => {
    testModule = await buildUITestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
  })

  afterEach(
    async () => {
      if (testModule) {
        await testModule.resetBrowserContexts()
        await testModule.resetAppState()
      }
    },
    { timeout: 30000 },
  )

  afterAll(async () => {
    if (testModule) {
      await testModule.shutdown()
    }
  })

  it('should load the homepage', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)

    await page.waitForLoadState('networkidle')

    // Take screenshot for verification
    await testModule!.takeScreenshot(page, 'homepage')

    // Verify page has loaded by checking the title or a known element
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title).toBe('Lombok')
  }, 30000) // 30 second timeout for test

  it('should navigate to login page', async () => {
    const { page } = await testModule!.getFreshPage()

    const loginUrl = `${testModule!.frontendBaseUrl}/login`
    await page.goto(loginUrl)

    await page.waitForLoadState('networkidle')

    // Take screenshot
    await testModule!.takeScreenshot(page, 'login-page')

    // Verify we're on the login page
    expect(page.url()).toContain('/login')
  }, 30000)
})
