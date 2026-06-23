import type { Page } from '@playwright/test'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import { createTestFolder, createTestUser } from '../../src/test/test.util'
import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  fillLoginForm,
  submitLoginForm,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_folder_upload_sanitize'

/**
 * Block until every uploading file shows 100% in the modal so the S3 PUT +
 * reindex/refresh pipeline is drained before the test returns. (See
 * file-upload.ui-e2e-spec.ts for why dangling subprocesses are a problem.)
 */
async function waitForUploadProgressComplete(
  page: Page,
  expectedFileCount: number,
  timeoutMs = 20000,
): Promise<void> {
  const rows = page.getByTestId('upload-progress-percent')
  await rows.first().waitFor({ state: 'attached', timeout: timeoutMs })
  await page.waitForFunction(
    (expected: number) => {
      const els = Array.from(
        document.querySelectorAll('[data-testid="upload-progress-percent"]'),
      )
      if (els.length < expected) {
        return false
      }
      return els.every((el) => el.textContent.trim() === '100%')
    },
    expectedFileCount,
    { timeout: timeoutMs },
  )
}

async function setupFolderAndOpenUploadModal(
  page: Page,
  testModule: UITestModule,
  folderName: string,
): Promise<string> {
  const username = `sanitizeuser${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  const password = `testpass${Math.random().toString(36).slice(2, 8)}`

  const { session } = await createTestUser(testModule, { username, password })

  const { folder } = await createTestFolder({
    testModule,
    folderName,
    accessToken: session.accessToken,
    mockFiles: [],
    apiClient: testModule.apiClient,
  })

  await page.goto(`${testModule.frontendBaseUrl}/login`, { timeout: 5000 })
  await page.waitForTimeout(1000)
  await fillLoginForm(page, username, password)
  await submitLoginForm(page)
  await page.waitForURL(`${testModule.frontendBaseUrl}/folders`, {
    timeout: 10000,
  })

  await page.goto(`${testModule.frontendBaseUrl}/folders/${folder.id}`)
  await page.waitForLoadState()

  const actionsButton = page.getByTestId('folder-actions-trigger')
  await actionsButton.waitFor({ state: 'visible', timeout: 5000 })
  await actionsButton.click({ force: true })
  await page.waitForTimeout(500)

  const uploadMenuItem = page
    .locator('[role="menuitem"]:has-text("Upload"), button:has-text("Upload")')
    .first()
  await uploadMenuItem.waitFor({ state: 'visible', timeout: 3000 })
  await uploadMenuItem.click()
  await page.waitForTimeout(500)

  return folder.id
}

/**
 * After the S3 PUT reaches 100% the worker still has to fire `refresh`, which
 * registers the object in the DB. A single folder reload races that write, so
 * re-fetch the listing (the SPA only fetches once per load) until the object's
 * link appears.
 */
async function waitForListedObject(
  page: Page,
  folderUrl: string,
  hrefKey: string,
  timeoutMs = 20000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await page.goto(folderUrl)
    await page.waitForLoadState()
    const link = page.locator(`a[href*="/objects/${hrefKey}"]`).first()
    const visible = await link
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (visible) {
      return true
    }
  }
  return false
}

describe('UI E2E - Folder Object Upload Filename Sanitize', () => {
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

  it('sanitizes a "%2F" filename to "_" on upload and lists it as a plain key', async () => {
    const page = await testModule!.getFreshPage()

    const folderId = await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Sanitize %2F ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.waitFor({ state: 'attached', timeout: 3000 })

    await fileInput.setInputFiles({
      name: 'a%2Fb.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('encoded-slash content'),
    })

    await waitForUploadProgressComplete(page, 1)

    // The object is listed under the sanitized key "a_b.txt".
    const listed = await waitForListedObject(
      page,
      `${testModule!.frontendBaseUrl}/folders/${folderId}`,
      'a_b.txt',
    )
    expect(listed).toBe(true)

    // The detail page for the sanitized (plain ".txt") key loads.
    await page.goto(
      `${testModule!.frontendBaseUrl}/folders/${folderId}/objects/a_b.txt`,
    )
    await page.waitForLoadState()
    const detailKey = page.locator('text=/a_b.txt/').first()
    await detailKey.waitFor({ state: 'visible', timeout: 10000 })
    expect(await detailKey.isVisible()).toBe(true)
  }, 45000)

  // A literal "/" in a filename can't be exercised through a file input — the
  // browser strips the path component — so we cover the case-insensitive "%2f"
  // form here; the "/"→"_" replacement is covered by the unit tests.
  it('sanitizes a lowercase "%2f" filename to "_" on upload and lists it as a plain key', async () => {
    const page = await testModule!.getFreshPage()

    const folderId = await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Sanitize %2f ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.waitFor({ state: 'attached', timeout: 3000 })

    await fileInput.setInputFiles({
      name: 'a%2fb.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('lowercase-encoded-slash content'),
    })

    await waitForUploadProgressComplete(page, 1)

    const listed = await waitForListedObject(
      page,
      `${testModule!.frontendBaseUrl}/folders/${folderId}`,
      'a_b.txt',
    )
    expect(listed).toBe(true)
  }, 45000)
})
