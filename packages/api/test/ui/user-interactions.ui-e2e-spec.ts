import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_user_interactions'

describe('UI E2E - User Interactions', () => {
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

  it('should handle click events', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Click on first button
    const button = page.locator('button').first()
    const hasButton = await button.isVisible().catch(() => false)

    expect(hasButton).toBe(true)

    await button.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'interaction-click')

    expect(await button.isEnabled()).toBe(true)
  }, 30000)

  it('should handle double click', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const element = page.locator('body').first()
    await element.dblclick({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'interaction-double-click')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)

  it('should handle right click context menu', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const element = page.locator('body').first()
    await element.click({ button: 'right' })
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'interaction-right-click')

    // Check if custom context menu appeared
    const contextMenu = page.locator('[role="menu"]').first()
    const hasContextMenu = await contextMenu.isVisible().catch(() => false)

    console.log('Has custom context menu:', hasContextMenu)

    expect(hasContextMenu).toBe(true)
  }, 30000)

  it('should handle hover effects', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const button = page.locator('button').first()
    const hasButton = await button.isVisible().catch(() => false)

    expect(hasButton).toBe(true)

    await button.hover()
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'interaction-hover')

    // Check if styles changed on hover
    const backgroundColor = await button.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    )
    console.log('Button background on hover:', backgroundColor)
    expect(backgroundColor).toBeTruthy()
  }, 30000)

  it('should handle focus state', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const input = page.locator('input').first()
    await input.focus()
    await page.waitForTimeout(200)

    await testModule!.takeScreenshot(page, 'interaction-focus')

    const isFocused = await input.evaluate(
      (el) => el === document.activeElement,
    )
    expect(isFocused).toBe(true)
  }, 30000)

  it('should handle blur event', async () => {
    const { page } = await testModule!.getFreshPage()

    await page.goto(`${testModule!.frontendBaseUrl}/login`)
    await page.waitForLoadState('networkidle')

    const input = page.locator('input').first()
    await input.focus()
    await page.waitForTimeout(100)

    await input.blur()
    await page.waitForTimeout(200)

    await testModule!.takeScreenshot(page, 'interaction-blur')

    const isFocused = await input.evaluate(
      (el) => el === document.activeElement,
    )
    expect(isFocused).toBe(false)
  }, 30000)

  it('should handle text selection', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for text to select
    const textElement = page.locator('h1, h2, p').first()
    const hasText = await textElement.isVisible().catch(() => false)

    expect(hasText).toBe(true)

    await textElement.click({ clickCount: 3 }) // Triple click to select all
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'interaction-text-selection')

    // Check if text is selected
    const selectedText = await page.evaluate(() =>
      window.getSelection()?.toString(),
    )
    console.log('Selected text length:', selectedText?.length)
    expect((selectedText ?? '').length).toBeGreaterThan(0)
  }, 30000)

  it('should handle drag and drop', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for draggable elements
    const draggable = page.locator('[draggable="true"]').first()
    const hasDraggable = await draggable.isVisible().catch(() => false)

    expect(hasDraggable).toBe(true)

    const dropTarget = page.locator('[class*="drop"]').first()
    const hasDropTarget = await dropTarget.isVisible().catch(() => false)

    expect(hasDropTarget).toBe(true)

    await draggable.dragTo(dropTarget)
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'interaction-drag-drop')
  }, 30000)

  it('should handle tooltip display', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for elements with tooltips
    const elementWithTooltip = page.locator('[title], [aria-label]').first()
    const hasElement = await elementWithTooltip.isVisible().catch(() => false)

    expect(hasElement).toBe(true)

    await elementWithTooltip.hover()
    await page.waitForTimeout(800)

    await testModule!.takeScreenshot(page, 'interaction-tooltip')

    // Look for tooltip
    const tooltip = page.locator('[role="tooltip"]').first()
    const hasTooltip = await tooltip.isVisible().catch(() => false)

    console.log('Has tooltip:', hasTooltip)
    expect(hasTooltip).toBe(true)
  }, 30000)

  it('should handle long press', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const button = page.locator('button').first()
    const hasButton = await button.isVisible().catch(() => false)

    expect(hasButton).toBe(true)

    // Simulate long press
    await button.hover()
    await page.mouse.down()
    await page.waitForTimeout(1000)
    await page.mouse.up()

    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'interaction-long-press')
    expect(await button.isVisible()).toBe(true)
  }, 30000)

  it('should handle multi-touch gestures', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Simulate pinch zoom
    await page.evaluate(() => {
      const event = new TouchEvent('touchstart', {
        touches: [
          // @ts-expect-error - simplified touch event
          { clientX: 100, clientY: 100 },
          // @ts-expect-error - simplified touch event
          { clientX: 200, clientY: 200 },
        ],
      })
      document.body.dispatchEvent(event)
    })

    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'interaction-multi-touch')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)
})
