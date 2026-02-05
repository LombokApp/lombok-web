import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_errors'

describe('UI E2E - Error Handling', () => {
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

  it('should display error for non-existent routes', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const nonExistentUrl = `${testModule!.frontendBaseUrl}/this-does-not-exist-${Date.now()}`

    await page.goto(nonExistentUrl)
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'error-404-route')

    // Page should load with some content (even if it's a 404 page)
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should recover from failed API requests', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState()

    // Intercept API requests and make them fail
    await page.route('**/api/**', (route) => {
      void route.abort('failed')
    })

    // Try to trigger an API call (e.g., login)
    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState()

    const usernameInput = page
      .locator('input[name="login"], input[type="text"]')
      .first()
    const passwordInput = page.locator('input[type="password"]').first()

    if (
      (await usernameInput.isVisible()) &&
      (await passwordInput.isVisible())
    ) {
      await usernameInput.fill('testuser')
      await passwordInput.fill('testpass')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(2000)

      await testModule!.takeScreenshot(page, 'error-api-failure')

      // Should still be on login page or show error
      expect(page.url()).toContain('/login')
    }
  }, 30000)

  it('should handle browser back on error pages', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Start at homepage
    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState()

    // Go to non-existent page
    await page.goto(`${testModule!.frontendBaseUrl}/nonexistent`)
    await page.waitForLoadState()

    // Go back
    await page.goBack()
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'error-back-button')

    // Should be back at homepage
    expect(page.url()).toBe(`${testModule!.frontendBaseUrl}/folders`)
  }, 30000)

  it('should handle session timeout gracefully', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(`${testModule!.frontendBaseUrl}/folders`)
    await page.waitForLoadState()
    expect(page.url()).toContain('/folders')

    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Try to navigate to a protected route (if any)
    await page.goto(`${testModule!.frontendBaseUrl}/profile`)
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'error-session-timeout')

    expect(page.url()).toContain('/login')
  }, 30000)
})
