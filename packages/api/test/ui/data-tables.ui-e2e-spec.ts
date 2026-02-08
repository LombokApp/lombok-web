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

  it('should render data table on page', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await testModule!.takeScreenshot(page, 'table-render')

    // Look for table elements
    const table = page.locator('table, [role="table"]').first()
    const hasTable = await table.isVisible().catch(() => false)

    console.log('Has table:', hasTable)

    expect(hasTable).toBe(true)

    const rows = table.locator('tr, [role="row"]')
    const rowCount = await rows.count()
    console.log('Row count:', rowCount)
    expect(rowCount).toBeGreaterThan(0)
  }, 30000)

  it('should sort table columns', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for sortable column headers
    const sortableHeader = page
      .locator('th[role="columnheader"], th button, th[class*="sort"]')
      .first()
    const hasSortable = await sortableHeader.isVisible().catch(() => false)

    expect(hasSortable).toBe(true)

    // Click to sort
    await sortableHeader.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-sort-asc')

    // Click again to reverse sort
    await sortableHeader.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-sort-desc')
  }, 30000)

  it('should filter table data', async () => {
    const { page } = await testModule!.getFreshPage()

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

    console.log('Filtered row count:', rowCount)
    expect(rowCount).toBeLessThanOrEqual(totalRows)
  }, 30000)

  it('should paginate table data', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for pagination controls
    const nextButton = page
      .locator('button:has-text("Next"), button[aria-label*="next" i]')
      .first()
    const hasNext = await nextButton.isVisible().catch(() => false)

    expect(hasNext).toBe(true)
    expect(await nextButton.isEnabled()).toBe(true)

    await nextButton.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-paginate')
  }, 30000)

  it('should select table rows', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for checkboxes in rows
    const checkbox = page
      .locator(
        'table tr input[type="checkbox"], [role="table"] [role="row"] input[type="checkbox"]',
      )
      .first()
    const hasCheckbox = await checkbox.isVisible().catch(() => false)

    expect(hasCheckbox).toBe(true)

    await checkbox.check()
    await page.waitForTimeout(300)

    await testModule!.takeScreenshot(page, 'table-select-row')

    const isChecked = await checkbox.isChecked()
    expect(isChecked).toBe(true)
  }, 30000)

  it('should select all table rows', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for select-all checkbox in header
    const selectAll = page
      .locator('thead input[type="checkbox"], th input[type="checkbox"]')
      .first()
    const hasSelectAll = await selectAll.isVisible().catch(() => false)

    expect(hasSelectAll).toBe(true)

    await selectAll.check()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-select-all')

    // Check if rows are selected
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
    const checkedCount = await rowCheckboxes.evaluateAll(
      (checkboxes) =>
        checkboxes.filter((cb) => (cb as HTMLInputElement).checked).length,
    )

    console.log('Checked rows:', checkedCount)
    expect(checkedCount).toBeGreaterThan(0)
  }, 30000)

  it('should resize table columns', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    await testModule!.takeScreenshot(page, 'table-before-resize')

    // Look for resize handles
    const resizeHandle = page
      .locator('th [class*="resize"], th [role="separator"]')
      .first()
    const hasResize = await resizeHandle.isVisible().catch(() => false)

    expect(hasResize).toBe(true)

    const box = await resizeHandle.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 50, box.y + box.height / 2)
      await page.mouse.up()

      await page.waitForTimeout(300)

      await testModule!.takeScreenshot(page, 'table-after-resize')
    }
  }, 30000)

  it('should show row actions menu', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Look for actions button/menu
    const actionsButton = page
      .locator(
        'table tr button:has-text("⋮"), table tr button[aria-label*="action" i], table tr button[aria-haspopup="menu"]',
      )
      .first()
    const hasActions = await actionsButton.isVisible().catch(() => false)

    expect(hasActions).toBe(true)

    await actionsButton.click()
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-row-actions')

    // Check if menu appeared
    const menu = page.locator('[role="menu"]').first()
    const hasMenu = await menu.isVisible().catch(() => false)

    console.log('Has actions menu:', hasMenu)
    expect(hasMenu).toBe(true)
  }, 30000)

  it('should handle empty table state', async () => {
    const { page } = await testModule!.getFreshPage()

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

    console.log('Has empty state message:', hasEmptyMessage)
    expect(hasEmptyMessage || rowCount === 0).toBe(true)
  }, 30000)

  it('should handle loading state', async () => {
    const { page } = await testModule!.getFreshPage()

    await testModule!.createTestUserAndLogin(page)

    // Set slow network to catch loading state
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (50 * 1024) / 8,
      uploadThroughput: (50 * 1024) / 8,
      latency: 500,
    })

    await page.goto(testModule!.frontendBaseUrl)

    // Try to catch loading state
    await page.waitForTimeout(500)

    await testModule!.takeScreenshot(page, 'table-loading-state')

    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    expect(await body.isVisible()).toBe(true)
  }, 30000)
})
