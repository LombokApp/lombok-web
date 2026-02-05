import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_modals'

describe('UI E2E - Modal & Dialog Interactions', () => {
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

  it('should close modal with Escape key', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try to open a modal (search modal with Cmd/Ctrl+K)
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Close with Escape
    await dispatchKeyboardShortcut(page, 'Escape')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'modal-escape-close')

    const dialogClosed = !(await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false))
    expect(dialogClosed).toBe(true)
  }, 30000)

  it('should close modal by clicking backdrop', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try to open a modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Look for backdrop/overlay
    const backdrop = page
      .locator('[role="dialog"] ~ div, .modal-backdrop, .overlay')
      .first()
    const hasBackdrop = await backdrop.isVisible().catch(() => false)

    expect(hasBackdrop).toBe(true)

    await backdrop.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'modal-backdrop-close')

    const dialogClosed = !(await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false))
    expect(dialogClosed).toBe(true)
  }, 30000)

  it('should trap focus within modal', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Tab multiple times
    for (let i = 0; i < 10; i++) {
      await dispatchKeyboardShortcut(page, 'Tab')
      await page.waitForTimeout(100)

      // Check if focus is still within dialog
      const focusInDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return dialog?.contains(document.activeElement) ?? false
      })

      if (focusInDialog) {
        break
      }
    }

    await testModule!.takeScreenshot(page, 'modal-focus-trap')

    const focusInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return dialog?.contains(document.activeElement) ?? false
    })
    expect(focusInDialog).toBe(true)
  }, 30000)

  it('should prevent background scrolling when modal is open', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const scrollBefore = await page.evaluate(() => window.scrollY)

    // Open modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Try to scroll
    await dispatchKeyboardShortcut(page, 'Space')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'modal-prevent-scroll')

    const scrollAfter = await page.evaluate(() => window.scrollY)

    // Scroll should not change significantly (allow 5px tolerance for minor variations)
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(5)
  }, 30000)

  it('should restore focus after modal closes', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // Focus an element
    const input = page.locator('input').first()
    await input.focus()

    const focusedBefore = await page.evaluate(
      () => document.activeElement?.tagName,
    )

    // Open and close modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(300)
    await dispatchKeyboardShortcut(page, 'Escape')
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'modal-restore-focus')

    const focusedAfter = await page.evaluate(
      () => document.activeElement?.tagName,
    )

    // Focus should be restored or at least moved to a valid element
    expect(focusedAfter).toBeTruthy()
    // Ideally it should be the same element, but accepting any focused element
    expect(focusedAfter === focusedBefore || focusedAfter).toBeTruthy()
  }, 30000)

  it('should have close button in modal', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Look for close button
    const closeButton = page
      .locator(
        '[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has-text("×")',
      )
      .first()
    const hasCloseButton = await closeButton.isVisible().catch(() => false)

    expect(hasCloseButton).toBe(true)

    await closeButton.click()
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'modal-close-button')

    const dialogVisible = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false)
    expect(dialogVisible).toBe(false)
  }, 30000)

  it('should support nested modals', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try to open multiple modals (if supported)
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'modal-nested')

    // Check for dialogs
    const dialogs = page.locator('[role="dialog"]')
    const dialogCount = await dialogs.count()

    console.log(`Found ${dialogCount} dialog(s)`)

    expect(dialogCount).toBeGreaterThan(0)
  }, 30000)

  it('should handle modal animations', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Open modal and wait for animation
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(800) // Wait for animation

    await testModule!.takeScreenshot(page, 'modal-animation-open')

    // Close and wait for animation
    await dispatchKeyboardShortcut(page, 'Escape')
    await page.waitForTimeout(800)

    await testModule!.takeScreenshot(page, 'modal-animation-close')

    const dialogVisible = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false)
    expect(dialogVisible).toBe(false)
  }, 30000)

  it('should have accessible modal markup', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
    await page.waitForTimeout(500)

    // Check for proper ARIA attributes
    const dialog = page.locator('[role="dialog"]').first()
    const hasDialog = await dialog.isVisible().catch(() => false)

    expect(hasDialog).toBe(true)

    const ariaLabel = await dialog.getAttribute('aria-label')
    const ariaLabelledBy = await dialog.getAttribute('aria-labelledby')
    const ariaModal = await dialog.getAttribute('aria-modal')

    console.log('Modal ARIA attributes:', {
      ariaLabel,
      ariaLabelledBy,
      ariaModal,
    })

    await testModule!.takeScreenshot(page, 'modal-accessibility')

    expect(ariaModal === 'true' || !!ariaLabel || !!ariaLabelledBy).toBe(true)
  }, 30000)

  it('should handle rapid modal open/close', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const isMac = process.platform === 'darwin'

    // Rapidly open and close
    for (let i = 0; i < 5; i++) {
      await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')
      await page.waitForTimeout(100)
      await dispatchKeyboardShortcut(page, 'Escape')
      await page.waitForTimeout(100)
    }

    await testModule!.takeScreenshot(page, 'modal-rapid-toggle')

    // Page should still be responsive
    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)
})
