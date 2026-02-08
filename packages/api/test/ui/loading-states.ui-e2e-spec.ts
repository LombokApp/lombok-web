import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_loading_states'

describe('UI E2E - Loading States', () => {
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

  it('should show loading spinner on page load', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Navigate and try to catch loading state
    const navigation = page.goto(testModule!.frontendBaseUrl)

    await page.waitForTimeout(100)

    await testModule!.takeScreenshot(page, 'loading-spinner-page')

    const spinner = page
      .locator(
        '[role="progressbar"], .spinner, [class*="spinner"], [class*="loading"]',
      )
      .first()
    const hasSpinner = await spinner.isVisible().catch(() => false)
    expect(hasSpinner).toBe(true)

    await navigation
    await page.waitForLoadState('networkidle')
  }, 30000)

  it('should show skeleton loaders', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set slow network to catch skeleton state
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (100 * 1024) / 8,
      uploadThroughput: (100 * 1024) / 8,
      latency: 1000,
    })

    const navigation = page.goto(testModule!.frontendBaseUrl)

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'loading-skeleton')

    // Look for skeleton elements
    const skeleton = page
      .locator('[class*="skeleton"], [class*="loading"]')
      .first()
    const hasSkeleton = await skeleton.isVisible().catch(() => false)

    console.log('Has skeleton loader:', hasSkeleton)

    await navigation
    await page.waitForLoadState('networkidle')

    expect(hasSkeleton).toBe(true)
  }, 45000)

  it('should show loading state on button click', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const usernameInput = page
      .locator('input[name="login"], input[type="text"]')
      .first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await usernameInput.fill('testuser')
    await passwordInput.fill('testpass')

    // Click and immediately check for loading state
    await submitButton.click()
    await page.waitForTimeout(200)

    await testModule!.takeScreenshot(page, 'loading-button')

    // Check if button is disabled or shows loading
    const isDisabled = await submitButton.isDisabled().catch(() => false)
    const buttonText = await submitButton.textContent()

    console.log('Button state:', { disabled: isDisabled, text: buttonText })

    const hasLoadingIndicator =
      isDisabled || !!buttonText?.toLowerCase().includes('loading')
    expect(hasLoadingIndicator).toBe(true)
  }, 30000)

  it('should show progress bar for loading', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const navigation = page.goto(testModule!.frontendBaseUrl)

    await page.waitForTimeout(200)

    // Look for progress bar
    const progressBar = page
      .locator('[role="progressbar"], progress, [class*="progress"]')
      .first()
    const hasProgressBar = await progressBar.isVisible().catch(() => false)

    await testModule!.takeScreenshot(page, 'loading-progress-bar')

    console.log('Has progress bar:', hasProgressBar)

    await navigation
    await page.waitForLoadState('networkidle')

    expect(hasProgressBar).toBe(true)
  }, 30000)

  it('should show loading overlay', async () => {
    const { page } = await testModule!.getFreshPage()

    // Set slow network
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (50 * 1024) / 8,
      uploadThroughput: (50 * 1024) / 8,
      latency: 1500,
    })

    const navigation = page.goto(`${testModule!.frontendBaseUrl}/login`)

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'loading-overlay')

    // Look for overlay
    const overlay = page
      .locator('[class*="overlay"], [class*="loading"]')
      .first()
    const hasOverlay = await overlay.isVisible().catch(() => false)

    console.log('Has loading overlay:', hasOverlay)

    await navigation
    await page.waitForLoadState('networkidle')

    expect(hasOverlay).toBe(true)
  }, 45000)

  it('should show loading text or message', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const navigation = page.goto(testModule!.frontendBaseUrl)

    await page.waitForTimeout(200)

    // Look for loading text
    const loadingText = page
      .locator('text=/loading|please wait|processing/i')
      .first()
    const hasLoadingText = await loadingText.isVisible().catch(() => false)

    await testModule!.takeScreenshot(page, 'loading-text')

    console.log('Has loading text:', hasLoadingText)

    await navigation
    await page.waitForLoadState('networkidle')

    expect(hasLoadingText).toBe(true)
  }, 30000)

  it('should show shimmer effect on loading', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set slow network
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (80 * 1024) / 8,
      uploadThroughput: (80 * 1024) / 8,
      latency: 1000,
    })

    const navigation = page.goto(testModule!.frontendBaseUrl)

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'loading-shimmer')

    // Look for shimmer/pulse animation
    const shimmer = page
      .locator('[class*="shimmer"], [class*="pulse"], [class*="animate"]')
      .first()
    const hasShimmer = await shimmer.isVisible().catch(() => false)

    console.log('Has shimmer effect:', hasShimmer)

    await navigation
    await page.waitForLoadState('networkidle')

    expect(hasShimmer).toBe(true)
  }, 45000)

  it('should handle infinite loading gracefully', async () => {
    const { page } = await testModule!.getFreshPage()

    // Block API calls to simulate infinite loading
    await page.route('**/api/**', (route) => {
      // Delay response significantly
      setTimeout(() => void route.abort(), 10000)
    })

    await page.goto(`${testModule!.frontendBaseUrl}/login`)

    await page.waitForTimeout(3000)

    await testModule!.takeScreenshot(page, 'loading-infinite')

    // Page should still be responsive with loading state
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should transition from loading to content', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set moderate network delay
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (200 * 1024) / 8,
      uploadThroughput: (200 * 1024) / 8,
      latency: 500,
    })

    await page.goto(testModule!.frontendBaseUrl)

    // Capture during loading
    await page.waitForTimeout(300)
    await testModule!.takeScreenshot(page, 'loading-transition-before')

    // Wait for content
    await page.waitForLoadState('networkidle')
    await testModule!.takeScreenshot(page, 'loading-transition-after')

    // Verify content is visible
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 45000)

  it('should show loading state for lazy-loaded components', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const heightBefore = await page.evaluate(() => document.body.scrollHeight)

    // Scroll down to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'loading-lazy-components')

    const heightAfter = await page.evaluate(() => document.body.scrollHeight)
    expect(heightAfter).toBeGreaterThanOrEqual(heightBefore)
  }, 30000)
})
