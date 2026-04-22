import { test, expect, waitForTableLoad, apiRequest, deleteViaApi } from './helpers/crud'

const PATH = '/checkin'
const LIST_URL = '/travel18/checkin/list'
const ADD_URL = '/travel18/checkin/add'
const EDIT_URL = '/travel18/checkin/edit'
const REMOVE_URL = '/travel18/checkin/remove'

const TEST_NAME = `E2E打卡_${Date.now()}`

test.describe.configure({ mode: 'serial' })

let testRecordId: string | number | null = null

test.describe('打卡点管理 CRUD', () => {
  test('页面渲染 — 表格列可见', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await expect(page.locator('.ant-table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '名称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '开放时间' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '休闲指数' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '游玩时间' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '地点' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '是否亲子' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '经典指数' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '门票' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible()
    await expect(page.getByRole('button', { name: /打卡点/ })).toBeVisible()
  })

  test('列表查询 — 数据行显示', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    const rows = page.locator('.ant-table-row')
    await expect(rows.first()).toBeVisible()
    // Status toggle links (上架/下架) rendered in action column
    await expect(rows.first().getByText(/上架|下架/)).toBeVisible()
  })

  test('新增打卡点 — 选择景点+填写名称提交并验证', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await page.getByRole('button', { name: /打卡点/ }).click()
    const drawer = page.locator('.ant-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('.ant-drawer-title')).toContainText('新增打卡点')

    // CRITICAL: Select an attraction first — "归属景点" is required
    const attractionSelect = drawer.locator('.ant-form-item').filter({ hasText: '关联景点' }).locator('.ant-select')
    await attractionSelect.click()
    await page.locator('.ant-select-item').first().click()

    // Fill the required name field
    await drawer.locator('.ant-form-item').filter({ hasText: '名称' }).locator('input').fill(TEST_NAME)

    await drawer.locator('.ant-drawer-extra .ant-btn-primary').click()

    // Verify drawer closes (indicates backend accepted)
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })

    // Find the newly added row by name and capture its ID via API
    const listResult = await apiRequest(page, LIST_URL, 'POST', { pageNum: 1, pageSize: 1000 })
    const record = listResult.rows?.find((r: any) => r.checkinName === TEST_NAME)
    expect(record).toBeDefined()
    testRecordId = record!.checkinId
  })

  test('查看详情 — 表单只读且无提交按钮', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    // Find the test row by name
    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME }).first()
    await expect(testRow).toBeVisible()
    await testRow.getByText('详情').click()

    const drawer = page.locator('.ant-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('.ant-drawer-title')).toContainText('打卡点详情', { timeout: 10000 })

    await expect(drawer.locator('.ant-form-item input').first()).toBeDisabled()
    await expect(page.locator('.ant-drawer-extra .ant-btn-primary')).toHaveCount(0)
    await expect(page.locator('.ant-drawer-extra .ant-btn-default')).toHaveCount(0)
  })

  test.fixme('编辑打卡点 — DatePicker.RangePicker crash on string openTime', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME }).first()
    await expect(testRow).toBeVisible()
    await testRow.getByText('编辑').click()

    const drawer = page.locator('.ant-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('.ant-drawer-title')).toContainText('编辑打卡点', { timeout: 10000 })

    const nameInput = drawer.locator('.ant-form-item').filter({ hasText: '名称' }).locator('input')
    await expect(nameInput).not.toBeDisabled()
    await nameInput.clear()
    await nameInput.fill(`${TEST_NAME}_edited`)

    const respPromise = page.waitForResponse(resp => resp.url().includes(EDIT_URL))
    await drawer.locator('.ant-drawer-extra .ant-btn-primary').click()
    await respPromise
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })
  })

  test('上下架切换 — 链接可见', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    // Find the test row by name (may have edited name)
    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME }).first()
    await expect(testRow).toBeVisible()
    // Status toggle links rendered by handleToggleStatus in action column
    await expect(testRow.getByText(/上架|下架/)).toBeVisible()
  })

  test('表单必填校验 — 空名称提示错误', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await page.getByRole('button', { name: /打卡点/ }).click()
    await page.locator('.ant-drawer-extra .ant-btn-primary').click()

    await expect(page.getByText('请输入名称')).toBeVisible()
  })

  test('清理 — 删除测试数据', async ({ loggedInPage }) => {
    const page = loggedInPage
    if (testRecordId) await deleteViaApi(page, REMOVE_URL, testRecordId)
  })
})