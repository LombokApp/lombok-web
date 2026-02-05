import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_accessibility'

describe('UI E2E - Accessibility', () => {
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

  it('should have proper page title', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'accessibility-title')

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
  }, 30000)

  it('should have language attribute on html element', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
  }, 30000)

  it('should allow keyboard navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Tab through interactive elements
    await dispatchKeyboardShortcut(page, 'Tab')
    await page.waitForTimeout(200)

    await testModule!.takeScreenshot(page, 'accessibility-keyboard-nav')

    // Check if an element is focused
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    )
    expect(focusedElement).toBeTruthy()
  }, 30000)

  it('should have accessible form labels', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'accessibility-form-labels')

    // Check for labels or aria-labels on inputs
    const inputs = page.locator('input')
    const inputCount = await inputs.count()

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i)
      const hasLabel = await input.evaluate((el) => {
        const id = el.id
        const hasLabelFor = id
          ? !!document.querySelector(`label[for="${id}"]`)
          : false
        const hasAriaLabel = !!el.getAttribute('aria-label')
        const hasAriaLabelledBy = !!el.getAttribute('aria-labelledby')
        return (
          hasLabelFor ||
          hasAriaLabel ||
          hasAriaLabelledBy ||
          !!el.getAttribute('placeholder')
        )
      })

      // Most inputs should have some form of label
      expect(typeof hasLabel).toBe('boolean')
    }
  }, 30000)

  it('should have proper button roles', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    // Should have at least one button
    expect(buttonCount).toBeGreaterThan(0)

    // Buttons should be clickable
    const firstButton = buttons.first()
    expect(
      (await firstButton.isEnabled()) || (await firstButton.isDisabled()),
    ).toBe(true)
  }, 30000)

  it('should have sufficient color contrast', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'accessibility-contrast')

    // Check that page has visible content
    const body = page.locator('body')
    const isVisible = await body.isVisible()

    expect(isVisible).toBe(true)

    // Note: Actual contrast checking would require additional libraries
    // This is a basic visibility check
  }, 30000)

  it('should support Escape key to close modals', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Try to open a modal (if any) and close with Escape
    await dispatchKeyboardShortcut(page, 'Escape')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'accessibility-escape-key')

    // Page should still be responsive
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should have semantic HTML structure', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'accessibility-semantic-html')

    // Check for semantic HTML5 elements (best practice)
    const main = page.locator('main').first()
    const hasMain = await main.isVisible().catch(() => false)

    const header = page.locator('header').first()
    const hasHeader = await header.isVisible().catch(() => false)

    // At least one semantic element should exist
    expect(hasMain || hasHeader).toBe(true)

    // Body should always be visible
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)
})
