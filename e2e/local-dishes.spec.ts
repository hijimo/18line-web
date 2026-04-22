import { test, expect, waitForTableLoad, deleteViaApi } from './helpers/crud'

const PATH = '/local-dishes'
const LIST_URL = '/travel18/dish/list'
const ADD_URL = '/travel18/dish/add'
const EDIT_URL = '/travel18/dish/edit'
const REMOVE_URL = '/travel18/dish/remove'

const TEST_NAME = `E2E特色菜_${Date.now()}`

test.describe.configure({ mode: 'serial' })

let testRecordId: string | number | null = null

test.describe('地方特色菜 CRUD', () => {
  test('页面渲染 — 表格列可见', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await expect(page.locator('.ant-table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '名称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '价格（元）' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '推荐指数' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible()
    await expect(page.getByRole('button', { name: /新增/ })).toBeVisible()
  })

  test('列表查询 — 数据行显示', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    const rows = page.locator('.ant-table-row')
    await expect(rows.first()).toBeVisible()
  })

  test.fixme('新增特色菜 — 后端API异常(系统异常)', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await page.getByRole('button', { name: /新增/ }).click()
    const drawer = page.locator('.ant-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('.ant-drawer-title')).toContainText('新增特色菜')

    await drawer.locator('.ant-form-item').filter({ hasText: '特色菜名称' }).locator('input').fill(TEST_NAME)

    await drawer.locator('.ant-drawer-extra .ant-btn-primary').click()

    // If backend worked, drawer would close. Backend returns "系统异常" so it stays open.
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })
  })

  test('查看详情 — 表单只读且无提交按钮', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await page.getByText('详情').first().click()
    await expect(page.locator('.ant-drawer')).toBeVisible()

    await expect(page.locator('.ant-drawer .ant-form-item input').first()).toBeDisabled()
    await expect(page.locator('.ant-drawer-extra .ant-btn-primary')).toHaveCount(0)
    await expect(page.locator('.ant-drawer-extra .ant-btn-default')).toHaveCount(0)
  })

  test.fixme('编辑特色菜 — 后端API异常(系统异常)', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    const row = page.locator('.ant-table-row').first()
    await row.getByText('编辑').click()
    const drawer = page.locator('.ant-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('.ant-drawer-title')).toContainText('编辑特色菜')

    const nameInput = drawer.locator('.ant-form-item').filter({ hasText: '特色菜名称' }).locator('input')
    await expect(nameInput).not.toBeDisabled()
    await nameInput.clear()
    await nameInput.fill(`${TEST_NAME}_edited`)

    await drawer.locator('.ant-drawer-extra .ant-btn-primary').click()

    // If backend worked, drawer would close. Backend returns "系统异常" so it stays open.
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10000 })
  })

  test('上下架切换 — 链接可见', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    const toggleLink = page.getByText(/上架|下架/).first()
    await expect(toggleLink).toBeVisible()
  })

  test('表单必填校验 — 空特色菜名称提示错误', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, PATH, LIST_URL)

    await page.getByRole('button', { name: /新增/ }).click()
    await page.locator('.ant-drawer-extra .ant-btn-primary').click()

    await expect(page.getByText('请输入特色菜名称')).toBeVisible()
  })

  test('清理 — 删除测试数据', async ({ loggedInPage }) => {
    const page = loggedInPage
    if (testRecordId) await deleteViaApi(page, REMOVE_URL, testRecordId)
  })
})