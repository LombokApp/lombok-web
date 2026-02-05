import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_navigation'

describe('UI E2E - Navigation', () => {
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

  it('should have working browser back button between authenticated pages', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // We should be on /folders after login
    const foldersUrl = page.url()
    expect(foldersUrl).toContain('/folders')

    // Navigate to settings (another authenticated page)
    await page.goto(`${testModule!.frontendBaseUrl}/account/settings`)
    await page.waitForLoadState()

    expect(page.url()).toContain('/account/settings')

    // Go back
    await page.goBack()
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'navigation-back')

    // Should be back at folders
    expect(page.url()).toBe(foldersUrl)
  }, 30000)

  it('should have working browser forward button', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Navigate to settings
    await page.goto(`${testModule!.frontendBaseUrl}/account/settings`)
    await page.waitForURL(`${testModule!.frontendBaseUrl}/account/settings`, {
      timeout: 3000,
    })

    // Go back to folders
    await page.goBack()
    await page.waitForURL(`${testModule!.frontendBaseUrl}/folders`, {
      timeout: 3000,
    })

    // Go forward to settings again
    await page.goForward({ waitUntil: 'load' })

    await testModule!.takeScreenshot(page, 'navigation-forward')

    // Should be at settings again
    expect(page.url()).toContain('/account/settings')
  }, 30000)

  it('should handle direct URL navigation to login page', async () => {
    const { page } = await testModule!.getFreshPage()

    // Navigate directly to login URL (unauthenticated)
    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'direct-url-navigation')

    expect(page.url()).toContain('/login')
    expect(await page.title()).toBe('Lombok')
  }, 30000)

  it('should handle page refresh on authenticated page', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const urlBeforeRefresh = page.url()

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'page-refresh')

    // Should still be on the same page after refresh
    expect(page.url()).toBe(urlBeforeRefresh)
  }, 30000)

  it('should render sidebar navigation when authenticated', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await testModule!.takeScreenshot(page, 'navigation-menu')

    // Look for sidebar navigation
    const sidebar = page.locator('aside, [role="navigation"]').first()
    const hasSidebar = await sidebar.isVisible().catch(() => false)

    expect(hasSidebar).toBe(true)

    // Should have navigation links
    const links = sidebar.locator('a')
    const linkCount = await links.count()

    expect(linkCount).toBeGreaterThan(0)
  }, 30000)

  it('should handle 404 pages gracefully', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Navigate to a non-existent route
    await page.goto(
      `${testModule!.frontendBaseUrl}/this-route-does-not-exist-${Date.now()}`,
    )
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, '404-page')

    // Page should still load without crashing
    const title = await page.title()
    expect(title).toBeTruthy()
  }, 30000)
})
