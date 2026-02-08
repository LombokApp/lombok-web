import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_responsive'

describe('UI E2E - Responsive Design', () => {
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

  it('should render properly on mobile viewport (iPhone)', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 })

    await testModule!.takeScreenshot(page, 'mobile-viewport')

    // Page should load and have content
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 10000)

  it('should render properly on tablet viewport (iPad)', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set tablet viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 })

    await testModule!.takeScreenshot(page, 'tablet-viewport')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 10000)

  it('should render properly on desktop viewport', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })

    await testModule!.takeScreenshot(page, 'desktop-viewport')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 10000)

  it('should adapt login page to mobile viewport', async () => {
    const { page } = await testModule!.getFreshPage()

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`${testModule!.frontendBaseUrl}/login`)

    await testModule!.takeScreenshot(page, 'mobile-login')

    // Login form should still be visible on mobile
    const inputs = page.locator('input')
    const firstInput = inputs.first()
    expect(await firstInput.isVisible()).toBe(true)
  }, 10000)

  it('should handle viewport resize', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Start with desktop
    await page.setViewportSize({ width: 1280, height: 720 })

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'viewport-resize')

    // Page should still be visible after resize
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 10000)

  it('should have no horizontal scroll on mobile', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)

    await testModule!.takeScreenshot(page, 'mobile-no-scroll')

    // Allow small differences (1-2px) due to scrollbars
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
  }, 10000)
})
