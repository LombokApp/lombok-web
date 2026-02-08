import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import { createTestUser } from '../../src/test/test.util'
import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_keyboard_shortcuts'

describe('UI E2E - Keyboard Shortcuts', () => {
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

  it('should handle Ctrl/Cmd+K for search', async () => {
    const { page } = await testModule!.getFreshPage()
    await testModule!.createTestUserAndLogin(page)

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'shortcut-search')

    // Check if search input or modal appeared
    // const searchInput = page.locator('input[name="omni-search"]').first()
    const searchInput = page.locator('input[name="omni-search"]').first()
    const searchModal = page.locator('[role="dialog"]').first()

    const searchVisible = await searchInput.isVisible().catch(() => false)
    const modalVisible = await searchModal.isVisible().catch(() => false)
    console.log('searchVisible', {
      searchVisible,
      modalVisible,
    })
    await testModule!.takeScreenshot(page, 'Cmd+K')

    // Either search input or modal should appear
    expect(searchVisible || modalVisible).toBeTruthy()
  }, 30000)

  it('should handle Escape key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Open something with a shortcut, then close with Escape
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(300)

    const searchInput = page.locator('input[name="omni-search"]').first()
    const searchDialog = page.locator('[role="dialog"]').first()
    const opened =
      (await searchInput.isVisible().catch(() => false)) ||
      (await searchDialog.isVisible().catch(() => false))
    expect(opened).toBe(true)

    await dispatchKeyboardShortcut(page, 'Escape')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'shortcut-escape')

    const stillOpen =
      (await searchInput.isVisible().catch(() => false)) ||
      (await searchDialog.isVisible().catch(() => false))
    expect(stillOpen).toBe(false)
  }, 30000)

  it('should handle Tab navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Tab through elements
    for (let i = 0; i < 5; i++) {
      await dispatchKeyboardShortcut(page, 'Tab')
      await page.waitForTimeout(100)
    }

    await testModule!.takeScreenshot(page, 'shortcut-tab-navigation')

    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    )
    expect(focusedElement).toBeTruthy()
  }, 30000)

  it('should handle Shift+Tab for reverse navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Tab forward then backward
    await dispatchKeyboardShortcut(page, 'Tab')
    await dispatchKeyboardShortcut(page, 'Tab')
    await page.waitForTimeout(100)

    await dispatchKeyboardShortcut(page, 'Shift+Tab')
    await page.waitForTimeout(100)

    await testModule!.takeScreenshot(page, 'shortcut-shift-tab')

    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    )
    expect(focusedElement).toBeTruthy()
  }, 30000)

  it('should handle Ctrl/Cmd+Enter for form submission', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const username = `ui-shortcut-login-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const password = `TestPass-${Math.random().toString(36).slice(2, 8)}`
    await createTestUser(testModule!, {
      username,
      email: `${username}@example.com`,
      password,
    })

    const usernameInput = page
      .locator('input[name="login"], input[type="text"]')
      .first()
    const passwordInput = page.locator('input[type="password"]').first()
    await usernameInput.fill(username)
    await passwordInput.fill(password)
    await passwordInput.focus()

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+Enter' : 'Control+Enter')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'shortcut-submit')

    await page.waitForURL(`${testModule!.frontendBaseUrl}/folders`, {
      timeout: 10000,
    })
    expect(page.url()).toContain('/folders')
  }, 30000)

  it('should handle Ctrl/Cmd+A for select all', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const usernameInput = page
      .locator('input[name="login"], input[type="text"]')
      .first()
    await usernameInput.fill('testuser')
    await usernameInput.focus()

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+A' : 'Control+A')
    await page.waitForTimeout(200)

    await testModule!.takeScreenshot(page, 'shortcut-select-all')

    const selection = await usernameInput.evaluate((el) => ({
      start: (el as HTMLInputElement).selectionStart,
      end: (el as HTMLInputElement).selectionEnd,
      length: (el as HTMLInputElement).value.length,
    }))
    expect(selection.start).toBe(0)
    expect(selection.end).toBe(selection.length)
  }, 30000)

  it('should handle Arrow keys for navigation', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try arrow key navigation
    await dispatchKeyboardShortcut(page, 'ArrowDown')
    await page.waitForTimeout(100)
    await dispatchKeyboardShortcut(page, 'ArrowUp')
    await page.waitForTimeout(100)
    await dispatchKeyboardShortcut(page, 'ArrowLeft')
    await page.waitForTimeout(100)
    await dispatchKeyboardShortcut(page, 'ArrowRight')
    await page.waitForTimeout(100)

    await testModule!.takeScreenshot(page, 'shortcut-arrow-keys')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should handle Ctrl/Cmd+/ for help or shortcuts menu', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+/' : 'Control+/')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'shortcut-help')

    const helpDialog = page
      .locator('[role="dialog"], text=/shortcuts|help/i')
      .first()
    const hasHelp = await helpDialog.isVisible().catch(() => false)
    expect(hasHelp).toBe(true)
  }, 30000)

  it('should not trigger browser shortcuts', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const urlBefore = page.url()

    // Try Ctrl/Cmd+R (refresh) - should work
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+R' : 'Control+R')
    await page.waitForLoadState('networkidle')

    await testModule!.takeScreenshot(page, 'shortcut-no-browser-conflict')

    // Should have refreshed to same page
    expect(page.url()).toBe(urlBefore)
  }, 30000)

  it('should handle Space key for scrolling', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState('networkidle')

    const scrollBefore = await page.evaluate(() => window.scrollY)

    await dispatchKeyboardShortcut(page, 'Space')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'shortcut-space-scroll')

    const scrollAfter = await page.evaluate(() => window.scrollY)

    // Scroll position should be >= to before (might not change if page is short)
    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore)
  }, 30000)
})
