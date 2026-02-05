import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  expectToastMessage,
  fillSignupForm,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_notifications'

describe('UI E2E - Notifications & Toasts', () => {
  let testModule: UITestModule | undefined

  beforeAll(async () => {
    testModule = await buildUITestModule({
      testModuleKey: TEST_MODULE_KEY,
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

  it('should display success toast on successful signup', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/signup`)
    await page.waitForLoadState('networkidle')

    // Create a unique test user
    const timestamp = Date.now()
    const username = `testuser${timestamp}`
    const email = `test${timestamp}@example.com`
    const password = 'TestPass123!'

    // Use helper to fill signup form
    await fillSignupForm(page, username, email, password)

    // Submit the form
    const submitButton = page.getByTestId('signup-submit-button')
    await submitButton.click()

    // Wait for and verify toast with success message
    await expectToastMessage(page, /account created/i)

    await testModule!.takeScreenshot(page, 'notification-success')
  }, 30000)

  it('should have close button on toast', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/signup`)
    await page.waitForLoadState('networkidle')

    // Create a unique test user to trigger a toast
    const timestamp = Date.now()
    const username = `testuser${timestamp}`
    const email = `test${timestamp}@example.com`
    const password = 'TestPass123!'

    await fillSignupForm(page, username, email, password)

    const submitButton = page.getByTestId('signup-submit-button')
    await submitButton.click()

    // Wait for toast to appear
    await page.waitForTimeout(1000)

    // Use data-testid for close button
    const closeButton = page.getByTestId('toast-close-button')
    const hasCloseButton = await closeButton.isVisible().catch(() => false)

    expect(hasCloseButton).toBe(true)

    await testModule!.takeScreenshot(page, 'toast-close-button')
  }, 30000)
})
