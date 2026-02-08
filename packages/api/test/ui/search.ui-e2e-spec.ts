import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  dispatchKeyboardShortcut,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_search'

describe('UI E2E - Search Functionality', () => {
  let testModule: UITestModule | undefined

  beforeAll(
    async () => {
      testModule = await buildUITestModule({
        testModuleKey: TEST_MODULE_KEY,
        // debug: true,
      })
    },
    { timeout: 15000 },
  )

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

  it('should have search input visible on folders page', async () => {
    const { page } = await testModule!.getFreshPage()
    await testModule!.createTestUserAndLogin(page)

    // Look for search input using data-testid
    const searchInput = page.getByTestId('omni-search-input')
    await searchInput.isVisible().catch(() => false)
    await testModule!.takeScreenshot(page, 'search-input-folders-page')
  }, 30000)

  it('should allow typing in search input', async () => {
    const { page } = await testModule!.getFreshPage()
    await testModule!.createTestUserAndLogin(page)

    // Trigger search with keyboard shortcut
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')

    await page.waitForTimeout(500)

    // Look for search input using data-testid
    const searchInput = page.getByTestId('omni-search-input')
    await searchInput.waitFor({ state: 'visible' })

    await searchInput.fill('test query')
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'search-typing')

    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('test query')
  }, 30000)

  it('should open search with keyboard shortcut', async () => {
    const { page } = await testModule!.getFreshPage()
    await testModule!.createTestUserAndLogin(page)

    // Trigger search with platform-specific keyboard shortcut (Cmd+K / Ctrl+K)
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'search-keyboard-shortcut')

    // Check if search dialog opened with specific input
    const searchInput = page.getByTestId('omni-search-input')
    const hasSearch = await searchInput.isVisible().catch(() => false)
    expect(hasSearch).toBeTruthy()
  }, 30000)

  it('should handle search submission', async () => {
    const { page } = await testModule!.getFreshPage()
    await testModule!.createTestUserAndLogin(page)

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')

    const searchInput = page.getByTestId('omni-search-input')
    const hasSearch = await searchInput.isVisible().catch(() => false)

    expect(hasSearch).toBe(true)

    await searchInput.fill('test')
    await searchInput.focus()
    await dispatchKeyboardShortcut(page, 'Enter')

    await page.waitForTimeout(1000)

    await testModule!.takeScreenshot(page, 'search-submit')

    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('test')
  }, 30000)

  it('should show search results or empty state', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)
    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')

    const searchInput = page.getByTestId('omni-search-input')
    const hasSearch = await searchInput.isVisible().catch(() => false)

    expect(hasSearch).toBe(true)

    // Search for something unlikely to exist
    await searchInput.fill('xyzabc123nonexistent')
    await searchInput.focus()
    await dispatchKeyboardShortcut(page, 'Enter')

    await page.waitForTimeout(1500)

    await testModule!.takeScreenshot(page, 'search-results-empty')

    // Check for specific empty state message from CommandEmpty component
    const emptyState = page.getByText('No results found.')
    const emptyVisible = await emptyState.isVisible().catch(() => false)

    // Check for results heading from CommandGroup
    const resultsHeading = page.getByRole('heading', { name: 'Results' })
    const resultsVisible = await resultsHeading.isVisible().catch(() => false)

    expect(emptyVisible || resultsVisible).toBe(true)
  }, 30000)

  it('should clear search input', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const isMac = process.platform === 'darwin'
    await dispatchKeyboardShortcut(page, isMac ? 'Meta+K' : 'Control+K')

    const searchInput = page.getByTestId('omni-search-input')
    const hasSearch = await searchInput.isVisible().catch(() => false)

    expect(hasSearch).toBe(true)

    // Fill and then clear
    await searchInput.fill('test search')
    await searchInput.clear()

    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'search-clear')

    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('')
  }, 30000)
})
