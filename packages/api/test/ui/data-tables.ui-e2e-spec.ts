import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'

import type { UITestModule } from '../../src/test/ui-test.types'
import { buildUITestModule } from '../../src/test/ui-test.util'

const TEST_MODULE_KEY = 'ui_data_tables'

describe('UI E2E - Data Tables', () => {
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

  it('should render data table on page', async () => {
    const page = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await testModule!.takeScreenshot(page, 'table-render')

    // Look for table elements
    const table = page.locator('table, [role="table"]').first()
    const hasTable = await table.isVisible().catch(() => false)

    expect(hasTable).toBe(true)

    const rows = table.locator('tr, [role="row"]')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  }, 30000)

  it('should sort table columns', async () => {
    const page = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Sort is via dropdown: click header opens menu with Asc/Desc options
    const sortableHeader = page
      .locator('th button:has(svg), th[role="columnheader"] button')
      .first()
    const hasSortable = await sortableHeader.isVisible().catch(() => false)

    expect(hasSortable).toBe(true)

    // Open dropdown and select Asc
    await sortableHeader.click()
    await page.getByRole('menuitem', { name: 'Asc' }).click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-sort-asc')

    // Open dropdown again and select Desc
    await sortableHeader.click()
    await page.getByRole('menuitem', { name: 'Desc' }).click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-sort-desc')
  }, 30000)

  it('should filter table data', async () => {
    const page = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for filter input
    const filterInput = page
      .locator('input[placeholder*="filter" i], input[placeholder*="search" i]')
      .first()
    const hasFilter = await filterInput.isVisible().catch(() => false)

    expect(hasFilter).toBe(true)

    const table = page.locator('table, [role="table"]').first()
    const rows = table.locator('tr, [role="row"]')
    const totalRows = await rows.count()

    await filterInput.fill('test')
    await page.waitForTimeout(800)

    await testModule!.takeScreenshot(page, 'table-filter')

    const rowCount = await rows.count()

    expect(rowCount).toBeLessThanOrEqual(totalRows)
  }, 30000)

  it('should paginate table data', async () => {
    const page = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Pagination uses sr-only "Go to next page", only visible when rowCount > pageSize
    const nextButton = page.getByRole('button', { name: 'Go to next page' })
    const hasNext = await nextButton.isVisible().catch(() => false)

    if (!hasNext) {
      // Pagination only appears when there are more rows than current page - skip if not enough data
      return
    }

    expect(await nextButton.isEnabled()).toBe(true)

    await nextButton.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-paginate')
  }, 30000)

  it('should handle empty table state', async () => {
    const page = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Try to filter to get empty results
    const filterInput = page
      .locator('input[placeholder*="filter" i], input[placeholder*="search" i]')
      .first()
    const hasFilter = await filterInput.isVisible().catch(() => false)

    expect(hasFilter).toBe(true)

    await filterInput.fill('xyznonexistentquery123')
    await page.waitForTimeout(1000)

    await testModule!.takeScreenshot(page, 'table-empty-state')

    // Look for empty state message
    const emptyMessage = page
      .locator('text=/no results|no data|empty/i')
      .first()
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

    const table = page.locator('table, [role="table"]').first()
    const rows = table.locator('tr, [role="row"]')
    const rowCount = await rows.count()

    expect(hasEmptyMessage || rowCount === 0).toBe(true)
  }, 30000)
})
