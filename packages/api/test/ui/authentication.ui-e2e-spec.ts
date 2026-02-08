import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  expectVisible,
  fillLoginForm,
  submitLoginForm,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_authentication'

describe('UI E2E - Authentication', () => {
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

  it('should display login page with form elements', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'login-form')

    // Verify login form elements exist using data-testid
    await expectVisible(page, 'login-username-input')
    await expectVisible(page, 'login-password-input')
    await expectVisible(page, 'login-submit-button')
  }, 30000)

  it('should navigate to signup page from login', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Click signup link using data-testid
    const signupLink = page.getByTestId('login-signup-link')
    await signupLink.click()
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'signup-page-navigation')

    // Verify we navigated to signup AND the form is visible
    expect(page.url()).toContain('signup')
    await expectVisible(page, 'signup-username-input')
    await expectVisible(page, 'signup-submit-button')
  }, 30000)

  it('should show error alert for invalid login credentials', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Fill in invalid credentials using helpers
    await fillLoginForm(page, 'nonexistent_user', 'wrongpassword')
    await submitLoginForm(page)

    // Wait for error alert to appear (not a toast, but an inline Alert)
    await page.waitForTimeout(1000)

    // Look for the specific "Login failed" error message in an alert
    const alert = page.getByRole('alert').filter({ hasText: 'Login failed' })
    const hasAlert = await alert.isVisible().catch(() => false)

    await testModule!.takeScreenshot(page, 'login-error')

    expect(hasAlert).toBe(true)

    // Verify the alert contains exactly the "Login failed" error message
    const alertText = await alert.textContent()
    expect(alertText).toBe('Login failed')

    // Should stay on login page after invalid credentials
    expect(page.url()).toContain('/login')
  }, 30000)

  it('should display signup page with required fields', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/signup`)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'signup-form')

    // Verify specific required fields exist
    await expectVisible(page, 'signup-username-input')
    await expectVisible(page, 'signup-email-input')
    await expectVisible(page, 'signup-password-input')
    await expectVisible(page, 'signup-confirm-password-input')
    await expectVisible(page, 'signup-submit-button')
  }, 30000)

  it('should validate required fields on signup', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/signup`)
    await page.waitForLoadState('networkidle')

    // Button should be disabled when form is empty (Zod validation)
    const submitButton = page.getByTestId('signup-submit-button')
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled).toBe(true)

    await testModule!.takeScreenshot(page, 'signup-validation')

    // Should still be on signup page
    expect(page.url()).toContain('/signup')
  }, 30000)

  it('should successfully login with valid credentials', async () => {
    const { page } = await testModule!.getFreshPage()

    // Use the helper to create user and login
    await testModule!.createTestUserAndLogin(page)

    await testModule!.takeScreenshot(page, 'login-success')

    // Should be redirected to folders page after successful login
    expect(page.url()).toContain('/folders')
  }, 30000)

  it('should disable submit button during login submission', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Fill valid-looking credentials using helpers
    await fillLoginForm(page, 'testuser', 'testpass123')

    const submitButton = page.getByTestId('login-submit-button')

    // Button should be enabled initially (form is valid)
    expect(await submitButton.isEnabled()).toBe(true)

    // Click and wait for spinner to appear
    const clickPromise = submitButton.click()

    // Wait for the spinner icon to appear or button to be disabled
    const spinnerIcon = submitButton.locator('svg.animate-spin')

    // Use Promise.race to catch either the spinner appearing or button being disabled
    const loadingStateDetected = await Promise.race([
      spinnerIcon
        .waitFor({ state: 'visible', timeout: 1000 })
        .then(() => true)
        .catch(() => false),
      page
        .waitForFunction(
          () => {
            const button = document.querySelector<HTMLButtonElement>(
              '[data-testid="login-submit-button"]',
            )!
            return button.disabled
          },
          null,
          { timeout: 1000 },
        )
        .then(() => true)
        .catch(() => false),
    ])

    await testModule!.takeScreenshot(page, 'login-submitting')

    await clickPromise

    // Verify the button showed a loading state
    expect(loadingStateDetected).toBe(true)
  }, 30000)
})
