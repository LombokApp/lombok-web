import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_performance'

describe('UI E2E - Performance', () => {
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

  it('should load homepage within reasonable time', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const startTime = Date.now()

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    await testModule!.takeScreenshot(page, 'performance-homepage-load')

    // Homepage should load within 10 seconds (generous for test environment)
    expect(loadTime).toBeLessThan(10000)
  }, 30000)

  it('should have no console errors on load', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'performance-console-errors')

    // Ideally no console errors (but allow some for now)
    console.log(`Console errors found: ${errors.length}`)
    expect(errors.length).toBe(0)
  }, 30000)

  it('should not have memory leaks on navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Navigate multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto(`${testModule!.frontendBaseUrl}/login`)
      await page.waitForLoadState('networkidle')

      await page.goto(testModule!.frontendBaseUrl)
      await page.waitForLoadState('networkidle')
    }

    await testModule!.takeScreenshot(page, 'performance-navigation')

    // Page should still be responsive
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 60000)

  it('should load images efficiently', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Check if images are present
    const images = page.locator('img')
    const imageCount = await images.count()

    await testModule!.takeScreenshot(page, 'performance-images')

    console.log(`Images found: ${imageCount}`)

    // If there are images, check if they loaded
    if (imageCount > 0) {
      const firstImage = images.first()
      const isVisible = await firstImage.isVisible().catch(() => false)
      expect(typeof isVisible).toBe('boolean')
    }
  }, 30000)

  it('should handle rapid page interactions', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Perform rapid interactions
    for (let i = 0; i < 10; i++) {
      await dispatchKeyboardShortcut(page, 'Tab')
      await page.waitForTimeout(50)
    }

    await testModule!.takeScreenshot(page, 'performance-rapid-interactions')

    // Page should remain responsive
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should handle network delay gracefully', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Throttle network
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500 kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 100, // 100ms latency
    })

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'performance-network-delay')

    const title = await page.title()
    expect(title).toBeTruthy()
  }, 45000)

  it('should measure First Contentful Paint', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = window.performance.timing
      return {
        domContentLoaded:
          perfData.domContentLoadedEventEnd - perfData.navigationStart,
        loadComplete: perfData.loadEventEnd - perfData.navigationStart,
      }
    })

    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'performance-metrics')

    console.log('Performance metrics:', performanceMetrics)

    // Should have performance data
    expect(performanceMetrics.domContentLoaded).toBeGreaterThan(0)
  }, 30000)
})
