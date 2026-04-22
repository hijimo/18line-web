import { test, expect, waitForTableLoad, apiRequest, deleteViaApi } from './helpers/crud'

const LIST_URL = '/travel18/photography/list'
const ADD_URL = '/travel18/photography/add'
const EDIT_URL = '/travel18/photography/edit'
const REMOVE_URL = '/travel18/photography/remove'

test.describe.configure({ mode: 'serial' })

const TEST_NAME = `E2E跟拍_${Date.now()}`

test.describe('跟拍管理', () => {
  let testRecordId: number | null = null

  test('页面渲染', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)

    await expect(page.locator('.ant-table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '序号' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '名称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible()
    await expect(page.getByRole('button', { name: /新增/ })).toBeVisible()
  })

  test('新增 — 真实创建数据', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)
    await page.getByRole('button', { name: /新增/ }).click()
    await expect(page.locator('.ant-drawer-title')).toContainText('新增跟拍')

    const drawer = page.locator('.ant-drawer')
    drawer.locator('.ant-form-item').filter({ hasText: '跟拍师名称' }).locator('input').fill(TEST_NAME)

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes(ADD_URL)),
      drawer.locator('.ant-drawer-extra .ant-btn-primary').click(),
    ])
    // Wait for drawer to close (backend success causes it to close)
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })

    // Find the new record in the table and get its ID
    await waitForTableLoad(page, '/photography', LIST_URL)
    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME })
    await expect(testRow).toBeVisible()

    // Extract ID from API for cleanup
    const listResult = await apiRequest(page, LIST_URL, 'POST', { pageNum: 1, pageSize: 1000 })
    const record = listResult.rows?.find((r: any) => r.nickname === TEST_NAME)
    testRecordId = record?.photographyId
  })

  test('查看详情', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)
    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME })
    await testRow.getByText('详情').click()
    await expect(page.locator('.ant-drawer-title')).toContainText('跟拍详情')

    await expect(page.locator('.ant-drawer .ant-form-item input').first()).toBeDisabled()
    await expect(page.locator('.ant-drawer-extra .ant-btn-primary')).toHaveCount(0)
    await expect(page.locator('.ant-drawer-extra .ant-btn-default')).toHaveCount(0)
  })

  test('编辑 — 真实修改数据', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)
    const testRow = page.locator('.ant-table-row').filter({ hasText: TEST_NAME })
    await testRow.getByText('编辑').click()
    await expect(page.locator('.ant-drawer-title')).toContainText('编辑跟拍')

    const drawer = page.locator('.ant-drawer')
    const nameInput = drawer.locator('.ant-form-item').filter({ hasText: '跟拍师名称' }).locator('input')
    await expect(nameInput).not.toBeDisabled()
    await nameInput.clear()
    await nameInput.fill(`E2E_Edit_${Date.now()}`)

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes(EDIT_URL)),
      drawer.locator('.ant-drawer-extra .ant-btn-primary').click(),
    ])
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })
  })

  test('上下架切换', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)
    const testRow = page.locator('.ant-table-row').filter({ hasText: 'E2E' })
    const toggleLink = testRow.first().getByText(/上架|下架/)
    await expect(toggleLink).toBeVisible()
  })

  test('表单必填校验', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/photography', LIST_URL)
    await page.getByRole('button', { name: /新增/ }).click()
    await page.locator('.ant-drawer-extra .ant-btn-primary').click()

    await expect(page.locator('.ant-drawer').getByText('请输入跟拍师名称')).toBeVisible()
  })

  test('清理 — 删除测试数据', async ({ loggedInPage }) => {
    const page = loggedInPage
    if (testRecordId) {
      await deleteViaApi(page, REMOVE_URL, testRecordId)
    }
  })
})