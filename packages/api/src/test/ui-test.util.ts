/* eslint-disable no-console */
import type { Type } from '@nestjs/common'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { chromium, firefox, webkit } from '@playwright/test'
import { spawn } from 'bun'
import fs from 'fs'
import path from 'path'

import type { TestModule } from './test.types'
import { buildTestModule, createTestUser } from './test.util'

const BACKEND_PORT_START = 7000
const FRONTEND_PORT_START = 7100
const TEST_RESULTS_DIR = path.resolve(__dirname, '../../../../test-results')

/**
 * Fill login form with username and password
 */
export async function fillLoginForm(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(password)
}

/**
 * Submit login form
 */
export async function submitLoginForm(page: Page): Promise<void> {
  await page.getByTestId('login-submit-button').click()
}

/**
 * Fill signup form with username, email, and password
 */
export async function fillSignupForm(
  page: Page,
  username: string,
  email: string,
  password: string,
): Promise<void> {
  await page.getByTestId('signup-username-input').fill(username)
  await page.getByTestId('signup-email-input').fill(email)
  await page.getByTestId('signup-password-input').fill(password)
  await page.getByTestId('signup-confirm-password-input').fill(password)
}

/**
 * Wait for and verify a toast message appears
 */
export async function expectToastMessage(
  page: Page,
  expectedText: string | RegExp,
  timeout = 10000,
): Promise<void> {
  // Wait a bit for the toast to trigger after form submission
  await page.waitForTimeout(500)

  const toast = page.getByTestId('toast')
  await toast.waitFor({ state: 'visible', timeout })

  const toastText = await toast.textContent()
  if (typeof expectedText === 'string') {
    if (!toastText?.includes(expectedText)) {
      throw new Error(
        `Toast text "${toastText}" does not include "${expectedText}"`,
      )
    }
  } else if (!expectedText.test(toastText ?? '')) {
    throw new Error(
      `Toast text "${toastText}" does not match pattern ${expectedText}`,
    )
  }
}

/**
 * Wait for toast to disappear
 */
export async function waitForToastDismiss(
  page: Page,
  timeout = 5000,
): Promise<void> {
  const toast = page.getByTestId('toast')
  await toast.waitFor({ state: 'hidden', timeout })
}

/**
 * Verify button is in loading state (disabled or has spinner)
 */
export async function expectButtonLoading(
  page: Page,
  dataTestId: string,
): Promise<void> {
  const button = page.getByTestId(dataTestId)

  const isDisabled = await button.isDisabled()
  const hasSpinner = await button
    .locator('.animate-spin')
    .isVisible()
    .catch(() => false)

  if (!isDisabled && !hasSpinner) {
    throw new Error(
      `Button ${dataTestId} is not in loading state (not disabled and no spinner)`,
    )
  }
}

/**
 * Verify element is visible and attached to DOM
 */
export async function expectVisible(
  page: Page,
  dataTestId: string,
  timeout = 3000,
): Promise<void> {
  const element = page.getByTestId(dataTestId)
  await element.waitFor({ state: 'visible', timeout })

  const isAttached = await element.isVisible()
  if (!isAttached) {
    throw new Error(`Element ${dataTestId} is not visible`)
  }
}

/**
 * Build the UI test module with backend API, frontend preview server, and Playwright browser
 */
export async function buildUITestModule({
  testModuleKey,
  overrides = [],
  debug = false,
  browserType = 'chromium',
  headless,
}: {
  testModuleKey: string
  debug?: boolean
  browserType?: 'chromium' | 'firefox' | 'webkit'
  headless?: boolean
  overrides?: { token: symbol | string | Type; value: unknown }[]
}): Promise<
  TestModule & {
    browser: Browser
    frontendBaseUrl: string
    backendUrl: string
    resetBrowserContexts: () => Promise<void>
    getFreshPage: (options?: {
      pageDebug?: boolean
      browserContext?: BrowserContext
    }) => Promise<{ page: Page; browserContext: BrowserContext }>
    createTestUserAndLogin: (
      page: Page,
      userDetails?: { username?: string; email?: string; password?: string },
    ) => Promise<{ username: string; email?: string; password: string }>
    takeScreenshot: (page: Page, name: string) => Promise<void>
  }
> {
  const isHeadless = headless ?? process.env.HEADLESS !== 'false'

  // 1. Start backend API server on dynamic port
  const backendPort = BACKEND_PORT_START + Math.floor(Math.random() * 100)
  if (debug) {
    console.log(`[1/4] Starting backend API server on port ${backendPort}...`)
  }

  const testModule = await buildTestModule({
    testModuleKey,
    startServerOnPort: backendPort,
    overrides,
    startCoreWorker: false,
    ...(debug ? { debug: true } : {}),
  })

  if (debug) {
    console.log(`[1/4] ✓ Backend API started on port ${backendPort}`)
  }

  // 2. Start Vite preview server on dynamic port
  const frontendPort = FRONTEND_PORT_START + Math.floor(Math.random() * 100)
  if (debug) {
    console.log(`[2/4] Starting Vite preview server on port ${frontendPort}...`)
  }

  const uiDir = path.resolve(__dirname, '../../../ui')

  const previewProcess = spawn({
    cmd: ['bun', 'vite', 'preview', '--port', String(frontendPort), '--host'],
    cwd: uiDir,
    stdout: debug ? 'inherit' : 'ignore',
    stderr: debug ? 'inherit' : 'ignore',
    env: {
      // ...process.env,
      // Configure Vite preview to proxy to test backend
      LOMBOK_BACKEND_HOST: `http://localhost:${backendPort}`,
    },
  })

  // Wait for preview server to be ready
  const frontendBaseUrl = `http://localhost:${frontendPort}`
  await testModule.services.ormService.waitForInit()

  if (debug) {
    console.log(`[2/4] ✓ Frontend preview server started at ${frontendBaseUrl}`)
  }

  // 3. Launch Playwright browser
  if (debug) {
    console.log(
      `[3/4] Launching Playwright ${browserType} browser (headless: ${isHeadless})...`,
    )
  }
  const browserModule =
    browserType === 'chromium'
      ? chromium
      : browserType === 'firefox'
        ? firefox
        : webkit

  const browser: Browser = await browserModule.launch({
    headless: isHeadless,
    args: isHeadless ? ['--disable-dev-shm-usage'] : [],
    executablePath:
      browserType === 'chromium'
        ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        : undefined,
  })

  if (debug) {
    console.log(`[3/4] ✓ Playwright ${browserType} browser launched`)
  }

  // 4. Create browser context (without video recording for now)
  if (debug) {
    console.log('[4/4] Creating browser context...')
  }
  const screenshotsDir = path.join(TEST_RESULTS_DIR, 'screenshots')
  // const videosDir = path.join(TEST_RESULTS_DIR, 'videos')

  // Ensure directories exist
  fs.mkdirSync(screenshotsDir, { recursive: true })
  // fs.mkdirSync(videosDir, { recursive: true })

  if (debug) {
    console.log('[4/4] ✓ Browser context created. UI test module ready!')
  }

  // Helper to take screenshot
  const takeScreenshot = async (page: Page, name: string): Promise<void> => {
    const screenshotPath = path.join(
      screenshotsDir,
      `${testModuleKey}-${name}.png`,
    )
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    })
    if (debug) {
      console.log(`Screenshot saved: ${screenshotPath}`)
    }
  }

  // 6. Return extended test module
  const originalShutdown = testModule.shutdown

  const browserContexts: BrowserContext[] = []

  const resetBrowserContexts = async () => {
    for (const browserContext of browserContexts) {
      for (const openPage of browserContext.pages()) {
        if (!openPage.isClosed()) {
          await openPage.close()
        }
      }
    }
    browserContexts.splice(0, browserContexts.length)
  }

  return {
    ...testModule,
    browser,
    frontendBaseUrl,
    backendUrl: `http://localhost:${backendPort}`,
    resetBrowserContexts,
    getFreshPage: async (options = {}) => {
      const browserContext =
        options.browserContext ??
        (await browser.newContext({
          viewport: { width: 1280, height: 720 },
          locale: 'en-US',
        }))

      if (!options.browserContext) {
        browserContexts.push(browserContext)
      }

      const page = await browserContext.newPage()

      if (options.pageDebug) {
        page.addListener('framenavigated', (frame) => {
          console.log('frame navigated', frame.url())
        })
        page.addListener('frameattached', (frame) => {
          console.log('frame attached', frame.url())
        })
        page.addListener('framedetached', (frame) => {
          console.log('frame detached', frame.url())
        })
        page.addListener('load', (_page) => {
          console.log('page load', _page.url())
        })
        page.addListener('request', (request) => {
          if (request.url().includes('/api/')) {
            console.log('page request', {
              url: request.url(),
              method: request.method(),
              headers: request.headers(),
              body: request.postData(),
            })
          }
        })
        page.addListener('response', (response) => {
          const contentType = response.headers()['content-type']
          if (contentType?.includes('application/json')) {
            console.log('page response', {
              url: response.url(),
              headers: response.headers(),
              // body: await response.text(),
              status: response.status(),
            })
          }
        })
        page.addListener('requestfailed', (request) => {
          console.log('page request failed', {
            url: request.url(),
            headers: request.headers(),
            method: request.method(),
            postData: request.postData(),
            failure: request.failure(),
          })
        })
        // Listen for all console events and handle errors
        page.on('console', (msg) => {
          console.log(`Console[${msg.type()}]: "${msg.text()}"`)
        })
      }
      return { page, browserContext }
    },
    takeScreenshot,
    createTestUserAndLogin: async (
      page: Page,
      userDetails?: { username?: string; email?: string; password?: string },
    ) => {
      const username =
        userDetails?.username ??
        `testuser${Date.now()}${Math.random().toString(36).slice(2, 8)}`
      const password =
        userDetails?.password ??
        `testpass${Math.random().toString(36).slice(2, 8)}`
      await createTestUser(testModule, {
        username,
        email: userDetails?.email,
        password,
      })

      await page.goto(`${frontendBaseUrl}/login`, {
        timeout: 5000,
      })

      await page.waitForTimeout(1000)
      await expectVisible(page, 'login-username-input', 5000)
      await expectVisible(page, 'login-password-input', 5000)

      await fillLoginForm(page, username, password)
      await takeScreenshot(page, 'form-filled')
      await submitLoginForm(page)

      await page.waitForURL(`${frontendBaseUrl}/folders`, {
        timeout: 10000,
      })

      // Verify folders page is loaded (using semantic selector for now)
      await page.waitForSelector('h1:has-text("Folders")', {
        state: 'attached',
        timeout: 20000,
      })
      return { username, password, email: userDetails?.email ?? undefined }
    },
    shutdown: async () => {
      // Cleanup in reverse order
      try {
        await resetBrowserContexts()
      } catch (error) {
        if (debug) {
          console.error('Error closing browser context:', error)
        }
      }

      try {
        await browser.close()
      } catch (error) {
        if (debug) {
          console.error('Error closing browser:', error)
        }
      }

      try {
        previewProcess.kill()
      } catch (error) {
        if (debug) {
          console.error('Error killing preview process:', error)
        }
      }

      await originalShutdown()
    },
  }
}

interface KeyboardShortcutOptions {
  targetSelector?: string
}

interface ParsedShortcut {
  key: string
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const parseKeyboardShortcut = (shortcut: string): ParsedShortcut => {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  const keyPart = parts.pop() ?? shortcut
  const modifiers = new Set(parts.map((part) => part.toLowerCase()))

  const ctrlKey = modifiers.has('ctrl') || modifiers.has('control')
  const metaKey =
    modifiers.has('meta') || modifiers.has('cmd') || modifiers.has('command')
  const altKey = modifiers.has('alt') || modifiers.has('option')
  const shiftKey = modifiers.has('shift')

  const normalized = keyPart.trim()
  const normalizedLower = normalized.toLowerCase()
  const namedKeyMap: Record<string, { key: string; code?: string }> = {
    tab: { key: 'Tab', code: 'Tab' },
    enter: { key: 'Enter', code: 'Enter' },
    escape: { key: 'Escape', code: 'Escape' },
    esc: { key: 'Escape', code: 'Escape' },
    space: { key: ' ', code: 'Space' },
    pagedown: { key: 'PageDown', code: 'PageDown' },
    pageup: { key: 'PageUp', code: 'PageUp' },
    home: { key: 'Home', code: 'Home' },
    end: { key: 'End', code: 'End' },
    arrowdown: { key: 'ArrowDown', code: 'ArrowDown' },
    arrowup: { key: 'ArrowUp', code: 'ArrowUp' },
    arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft' },
    arrowright: { key: 'ArrowRight', code: 'ArrowRight' },
  }

  const namedMatch = namedKeyMap[normalizedLower]
  if (namedMatch) {
    return {
      ...namedMatch,
      ctrlKey,
      metaKey,
      altKey,
      shiftKey,
    }
  }

  if (normalized.length === 1) {
    const key = /[a-z]/i.test(normalized)
      ? normalized.toLowerCase()
      : normalized
    let code: string | undefined
    if (/[a-z]/i.test(normalized)) {
      code = `Key${normalized.toUpperCase()}`
    } else if (/[0-9]/.test(normalized)) {
      code = `Digit${normalized}`
    } else if (normalized === '/') {
      code = 'Slash'
    } else if (normalized === '\\') {
      code = 'Backslash'
    } else if (normalized === '-') {
      code = 'Minus'
    } else if (normalized === '=') {
      code = 'Equal'
    }
    return {
      key,
      code,
      ctrlKey,
      metaKey,
      altKey,
      shiftKey,
    }
  }

  return {
    key: normalized,
    code: normalized,
    ctrlKey,
    metaKey,
    altKey,
    shiftKey,
  }
}

export async function dispatchKeyboardShortcut(
  page: Page,
  shortcut: string,
  options: KeyboardShortcutOptions = {},
): Promise<void> {
  const parsedShortcut = parseKeyboardShortcut(shortcut)
  await page.evaluate(
    ({ key, code, ctrlKey, metaKey, altKey, shiftKey, targetSelector }) => {
      const target = targetSelector?.length
        ? document.querySelector(targetSelector)
        : (document.activeElement ?? document.body)
      const eventTarget = target ?? document
      const eventInit = {
        key,
        code,
        ctrlKey,
        metaKey,
        altKey,
        shiftKey,
        bubbles: true,
        cancelable: true,
      }
      eventTarget.dispatchEvent(new KeyboardEvent('keydown', eventInit))
      eventTarget.dispatchEvent(new KeyboardEvent('keyup', eventInit))
    },
    {
      ...parsedShortcut,
      targetSelector: options.targetSelector ?? null,
    },
  )
}
/* eslint-enable no-console */
