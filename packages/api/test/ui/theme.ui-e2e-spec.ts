import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_theme'

describe('UI E2E - Theme & Appearance', () => {
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

  it('should load with default theme set in data-mode attribute', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await page.goto(testModule!.frontendBaseUrl)
    await page.waitForLoadState()

    await testModule!.takeScreenshot(page, 'theme-default')

    // The theme provider sets data-mode attribute on html element
    const htmlDataMode = await page.locator('html').getAttribute('data-mode')

    expect(htmlDataMode).toBeTruthy()
    expect(['light', 'dark', 'system']).toContain(htmlDataMode!)
  }, 30000)

  it('should have theme toggle dropdown in sidebar', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const themeToggleButton = page.getByTestId('theme-toggle')
    const hasToggle = await themeToggleButton.isVisible()

    await testModule!.takeScreenshot(page, 'theme-toggle-button')

    expect(hasToggle).toBe(true)
  }, 30000)

  it('should open theme dropdown menu and show options', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const themeToggleButton = page.getByTestId('theme-toggle')
    await themeToggleButton.click()
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'theme-dropdown-open')

    // Check that the dropdown menu items appear
    const lightOption = page.getByRole('menuitem', { name: /light/i })
    const darkOption = page.getByRole('menuitem', { name: /dark/i })
    const systemOption = page.getByRole('menuitem', { name: /system/i })

    expect(await lightOption.isVisible()).toBe(true)
    expect(await darkOption.isVisible()).toBe(true)
    expect(await systemOption.isVisible()).toBe(true)
  }, 30000)

  it('should change theme when selecting from dropdown', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    const beforeTheme = await page.locator('html').getAttribute('data-mode')

    // Open dropdown and select dark mode
    const themeToggleButton = page.getByTestId('theme-toggle')
    await themeToggleButton.click()
    await page.waitForTimeout(200)

    const darkOption = page.getByRole('menuitem', { name: /dark/i })
    await darkOption.click()
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'theme-changed-to-dark')

    const afterTheme = await page.locator('html').getAttribute('data-mode')

    expect(afterTheme).toBe('dark')
    expect(afterTheme).not.toBe(beforeTheme)
  }, 30000)

  it('should persist theme preference in localStorage', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set theme to dark
    const themeToggleButton = page.getByTestId('theme-toggle')
    await themeToggleButton.click()
    await page.waitForTimeout(200)

    const darkOption = page.getByRole('menuitem', { name: /dark/i })
    await darkOption.click()
    await page.waitForTimeout(300)

    const themeAfterToggle = await page
      .locator('html')
      .getAttribute('data-mode')
    expect(themeAfterToggle).toBe('dark')

    // Reload page
    await page.reload()

    const themeAfterReload = await page
      .locator('html')
      .getAttribute('data-mode')

    await testModule!.takeScreenshot(page, 'theme-persisted')

    expect(themeAfterReload).toBe('dark')
    expect(themeAfterReload).toBe(themeAfterToggle)

    // Verify localStorage
    const localStorageTheme = await page.evaluate(() =>
      localStorage.getItem('theme'),
    )
    expect(localStorageTheme).toBe('dark')
  }, 30000)

  it('should apply theme to unauthenticated pages as well', async () => {
    const { page } = await testModule!.getFreshPage()

    // Navigate to login page (unauthenticated)
    await page.goto(`${testModule!.frontendBaseUrl}/login`)

    await testModule!.takeScreenshot(page, 'theme-login-page')

    // Check that theme attribute is set
    const htmlDataMode = await page.locator('html').getAttribute('data-mode')
    expect(htmlDataMode).toBeTruthy()
    expect(['light', 'dark', 'system']).toContain(htmlDataMode!)
  }, 30000)

  it('should have CSS custom properties for theming', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Check that CSS custom properties exist
    const colors = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement)
      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        primary: styles.getPropertyValue('--primary').trim(),
      }
    })

    await testModule!.takeScreenshot(page, 'theme-css-variables')

    // At least one color variable should be defined
    expect(
      colors.background || colors.foreground || colors.primary,
    ).toBeTruthy()
  }, 30000)
})
