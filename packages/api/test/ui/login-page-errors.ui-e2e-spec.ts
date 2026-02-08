import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_login_page_errors'

describe('UI E2E - Login Page Error Handling', () => {
  let testModule: UITestModule | undefined

  beforeAll(
    async () => {
      testModule = await buildUITestModule({
        testModuleKey: TEST_MODULE_KEY,
        // debug: true,
      })
    },
    { timeout: 30000 },
  )

  afterEach(
    async () => {
      if (testModule) {
        await testModule.resetBrowserContexts()
        await testModule.resetAppState()
      }
    },
    { timeout: 30000 },
  )

  afterAll(
    async () => {
      if (testModule) {
        await testModule.shutdown()
      }
    },
    { timeout: 30000 },
  )

  it('should display user-friendly error messages', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('load')

    // Try to submit with invalid data
    const usernameInput = page
      .locator('input[name="login"], input[type="text"]')
      .first()
    const passwordInput = page.locator('input[type="password"]').first()

    await usernameInput.fill('invalid@user')
    await passwordInput.fill('123')

    await page.locator('button[type="submit"]').first().click()

    await page.waitForTimeout(500)

    const errorMessage = page
      .locator('div[role=alert].text-destructive')
      .first()
    expect(await errorMessage.isVisible()).toBe(true)
    expect(await errorMessage.textContent()).toContain('Login failed')

    await testModule!.takeScreenshot(page, 'error-validation-message')
  }, 30000)
})
