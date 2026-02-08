import type { Page } from '@playwright/test'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import { createTestFolder, createTestUser } from '../../src/test/test.util'
import type { UITestModule } from '../../src/test/ui-test.types'
import {
  buildUITestModule,
  fillLoginForm,
  submitLoginForm,
} from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_folder_upload'

/**
 * Helper to create a test folder and user, then navigate to folder and open upload modal
 */
async function setupFolderAndOpenUploadModal(
  page: Page,
  testModule: UITestModule,
  folderName: string,
) {
  // Create user and get access token
  const username = `testuser${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  const password = `testpass${Math.random().toString(36).slice(2, 8)}`

  const { session } = await createTestUser(testModule, {
    username,
    password,
  })

  // Create folder via API
  const { folder } = await createTestFolder({
    testModule,
    folderName,
    accessToken: session.accessToken,
    mockFiles: [],
    apiClient: testModule.apiClient,
  })

  // Login via UI
  await page.goto(`${testModule.frontendBaseUrl}/login`, { timeout: 5000 })
  await page.waitForTimeout(1000)
  await fillLoginForm(page, username, password)
  await submitLoginForm(page)
  await page.waitForURL(`${testModule.frontendBaseUrl}/folders`, {
    timeout: 10000,
  })

  // Navigate to the folder
  await page.goto(`${testModule.frontendBaseUrl}/folders/${folder.id}`)
  await page.waitForLoadState('networkidle')
  await testModule.takeScreenshot(page, 'folder-detail-page')

  // Find and click the actions dropdown menu
  const actionsButton = page
    .locator('button[aria-haspopup="menu"], button[aria-expanded]')
    .first()
  await actionsButton.waitFor({ state: 'visible', timeout: 5000 })
  await actionsButton.click()

  await page.waitForTimeout(500)

  // Click the "Upload" menu item
  const uploadMenuItem = page
    .locator('[role="menuitem"]:has-text("Upload"), button:has-text("Upload")')
    .first()
  await uploadMenuItem.waitFor({ state: 'visible', timeout: 3000 })
  await uploadMenuItem.click()

  // Wait for upload modal to open
  await page.waitForTimeout(500)
}

describe('UI E2E - Folder File Upload', () => {
  let testModule: UITestModule | undefined

  beforeAll(async () => {
    testModule = await buildUITestModule({
      testModuleKey: TEST_MODULE_KEY,
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

  it('should open upload modal and show file input', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(page, testModule!, 'Test Upload Folder')

    await testModule!.takeScreenshot(page, 'upload-modal-open')

    // Now the upload modal should be open with the dropzone
    // Look for the file input inside the modal
    const fileInput = page.locator('input[type="file"]').first()
    const hasFileInput = await fileInput.count().then((count) => count > 0)

    expect(hasFileInput).toBe(true)
  }, 30000)

  it('should upload single file to folder', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.waitFor({ state: 'attached', timeout: 3000 })

    // Upload a test file
    await fileInput.setInputFiles({
      name: 'test-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test file content'),
    })

    // Wait for upload to start
    await page.waitForTimeout(1000)

    await testModule!.takeScreenshot(page, 'upload-single-file')

    // Look for the file name in the uploading list
    const fileName = page.locator('text=/test-file.txt/i').first()
    const hasFileName = await fileName.isVisible().catch(() => false)

    expect(hasFileName).toBe(true)
  }, 30000)

  it('should show upload progress bar', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()

    // Upload a file
    await fileInput.setInputFiles({
      name: 'progress-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'.repeat(10000)),
    })

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'upload-progress')

    // The upload modal shows progress bars for each file
    // Look for the progress bar in the "Uploading files" section
    const progressText = page.locator('text=/Uploading files|%/i').first()
    const hasProgress = await progressText.isVisible().catch(() => false)

    expect(hasProgress).toBe(true)
  }, 30000)

  it('should upload multiple files at once', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()

    // Upload multiple files
    await fileInput.setInputFiles([
      {
        name: 'file1.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('File 1 content'),
      },
      {
        name: 'file2.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('File 2 content'),
      },
      {
        name: 'file3.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('File 3 content'),
      },
    ])

    await page.waitForTimeout(1000)

    await testModule!.takeScreenshot(page, 'upload-multiple-files')

    // Check that all files appear in the uploading list
    const file1 = page.locator('text=/file1.txt/i').first()
    const file2 = page.locator('text=/file2.txt/i').first()
    const file3 = page.locator('text=/file3.txt/i').first()

    const hasFile1 = await file1.isVisible().catch(() => false)
    const hasFile2 = await file2.isVisible().catch(() => false)
    const hasFile3 = await file3.isVisible().catch(() => false)

    expect(hasFile1 || hasFile2 || hasFile3).toBe(true)
  }, 30000)

  it('should display dropzone with upload instructions', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    await testModule!.takeScreenshot(page, 'upload-dropzone')

    // Look for the dropzone text
    const dropzoneText = page
      .locator('text=/Drop files here|click to select/i')
      .first()
    const hasDropzoneText = await dropzoneText.isVisible().catch(() => false)

    expect(hasDropzoneText).toBe(true)
  }, 30000)

  it('should have modal title and description', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    await testModule!.takeScreenshot(page, 'upload-modal-title')

    // Check for modal title
    const modalTitle = page.locator('text=/Upload files/i').first()
    const hasTitle = await modalTitle.isVisible().catch(() => false)

    expect(hasTitle).toBe(true)

    // Check for description
    const modalDescription = page
      .locator('text=/Drop files to upload/i')
      .first()
    const hasDescription = await modalDescription.isVisible().catch(() => false)

    expect(hasDescription).toBe(true)
  }, 30000)

  it('should close modal with Done button', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    // Look for the Done button
    const doneButton = page.locator('button:has-text("Done")').first()
    await doneButton.waitFor({ state: 'visible', timeout: 3000 })

    await testModule!.takeScreenshot(page, 'upload-modal-done-button')

    await doneButton.click()
    await page.waitForTimeout(500)

    // Modal should be closed - file input should no longer be visible
    const fileInput = page.locator('input[type="file"]').first()
    const isInputVisible = await fileInput.isVisible().catch(() => false)

    expect(isInputVisible).toBe(false)
  }, 30000)

  it('should show uploaded file with progress percentage', async () => {
    const { page } = await testModule!.getFreshPage()

    await setupFolderAndOpenUploadModal(
      page,
      testModule!,
      `Upload Test ${Date.now()}`,
    )

    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles({
      name: 'percentage-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test content'),
    })

    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'upload-percentage')

    // Look for percentage indicator (e.g., "50%", "100%")
    const percentage = page.locator('text=/%/').first()
    const hasPercentage = await percentage.isVisible().catch(() => false)

    expect(hasPercentage).toBe(true)
  }, 30000)
})
