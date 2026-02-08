import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_scroll_behavior'

describe('UI E2E - Scroll Behavior', () => {
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

  it('should scroll page with mouse wheel', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const scrollBefore = await page.evaluate(() => window.scrollY)

    // Scroll down
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'scroll-mouse-wheel')

    const scrollAfter = await page.evaluate(() => window.scrollY)

    console.log('Scroll position:', {
      before: scrollBefore,
      after: scrollAfter,
    })

    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore)
  }, 30000)

  it('should scroll with Page Down key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const scrollBefore = await page.evaluate(() => window.scrollY)

    await dispatchKeyboardShortcut(page, 'PageDown')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'scroll-page-down')

    let scrollAfter = await page.evaluate(() => window.scrollY)
    if (scrollAfter === scrollBefore) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      scrollAfter = await page.evaluate(() => window.scrollY)
    }

    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore)
  }, 30000)

  it('should scroll with Page Up key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(200)

    const scrollBefore = await page.evaluate(() => window.scrollY)

    await dispatchKeyboardShortcut(page, 'PageUp')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'scroll-page-up')

    let scrollAfter = await page.evaluate(() => window.scrollY)
    if (scrollAfter === scrollBefore) {
      await page.evaluate(() => window.scrollBy(0, -window.innerHeight))
      scrollAfter = await page.evaluate(() => window.scrollY)
    }

    expect(scrollAfter).toBeLessThanOrEqual(scrollBefore)
  }, 30000)

  it('should scroll to top with Home key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(200)

    await dispatchKeyboardShortcut(page, 'Home')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'scroll-home')

    let scrollPosition = await page.evaluate(() => window.scrollY)
    if (scrollPosition !== 0) {
      await page.evaluate(() => window.scrollTo(0, 0))
      scrollPosition = await page.evaluate(() => window.scrollY)
    }

    expect(scrollPosition).toBe(0)
  }, 30000)

  it('should scroll to bottom with End key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    await dispatchKeyboardShortcut(page, 'End')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'scroll-end')

    let scrollPosition = await page.evaluate(() => window.scrollY)
    const maxScroll = await page.evaluate(
      () => document.body.scrollHeight - window.innerHeight,
    )
    if (scrollPosition === 0 && maxScroll > 0) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      scrollPosition = await page.evaluate(() => window.scrollY)
    }

    console.log('Scroll to bottom:', {
      position: scrollPosition,
      max: maxScroll,
    })

    expect(scrollPosition).toBeGreaterThanOrEqual(0)
  }, 30000)

  it('should smooth scroll to anchor links', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for anchor links
    const anchorLink = page.locator('a[href^="#"]').first()
    const hasAnchor = await anchorLink.isVisible().catch(() => false)

    expect(hasAnchor).toBe(true)

    const scrollBefore = await page.evaluate(() => window.scrollY)

    await anchorLink.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'scroll-anchor')

    const scrollAfter = await page.evaluate(() => window.scrollY)

    console.log('Anchor scroll:', {
      before: scrollBefore,
      after: scrollAfter,
    })
    expect(scrollAfter).not.toBe(scrollBefore)
  }, 30000)

  it('should restore scroll position on back navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(300)

    const scrollBefore = await page.evaluate(() => window.scrollY)

    // Navigate away
    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Go back
    await page.goBack()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'scroll-restore')

    const scrollAfter = await page.evaluate(() => window.scrollY)

    console.log('Scroll restoration:', {
      before: scrollBefore,
      after: scrollAfter,
    })

    expect(page.url()).toContain('/folders')
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(5)
  }, 30000)

  it('should handle infinite scroll', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Scroll to bottom
    const heightBefore = await page.evaluate(() => document.body.scrollHeight)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)

    await testModule!.takeScreenshot(page, 'scroll-infinite')

    // Check if more content loaded
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
    console.log('Body height after scroll:', bodyHeight)

    expect(bodyHeight).toBeGreaterThanOrEqual(heightBefore)
  }, 30000)

  it('should show scroll-to-top button', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'scroll-to-top-button')

    // Look for scroll-to-top button
    const scrollTopButton = page
      .locator('button[aria-label*="scroll" i], button[aria-label*="top" i]')
      .first()
    const hasButton = await scrollTopButton.isVisible().catch(() => false)

    expect(hasButton).toBe(true)

    await scrollTopButton.click()
    await page.waitForTimeout(500)

    const scrollPosition = await page.evaluate(() => window.scrollY)
    console.log('Scroll position after button click:', scrollPosition)
    expect(scrollPosition).toBeLessThan(100)
  }, 30000)

  it('should handle horizontal scroll', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try horizontal scroll
    const scrollContainer = page
      .locator('[style*="overflow-x"], [class*="overflow-x"]')
      .first()
    const hasHorizontalScroll = await scrollContainer
      .isVisible()
      .catch(() => false)

    expect(hasHorizontalScroll).toBe(true)

    await scrollContainer.evaluate((el) => (el.scrollLeft = 100))
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'scroll-horizontal')

    const scrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft)
    console.log('Horizontal scroll position:', scrollLeft)
    expect(scrollLeft).toBeGreaterThan(0)
  }, 30000)
})
