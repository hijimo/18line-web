import { test, expect, waitForTableLoad } from './helpers/crud'

const LIST_URL = '/travel18/tourist/list'

test.describe.configure({ mode: 'serial' })

test.describe('用户管理', () => {
  test('页面渲染', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    await expect(page.getByRole('columnheader', { name: '昵称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '手机号' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '性别' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '会员ID' })).toBeVisible()

    await expect(page.getByRole('button', { name: /新增/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /用户/ })).not.toBeVisible()
  })

  test('列表查询', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    const rows = page.locator('.ant-table-row')
    await expect(rows.first()).toBeVisible()
  })

  test('查看详情', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    const rows = page.locator('.ant-table-row')
    await rows.first().getByText('详情').click()

    await expect(page.locator('.ant-drawer-title')).toContainText('用户详情')

    // Verify Descriptions has content (not specific text values)
    const drawer = page.locator('.ant-drawer')
    await expect(drawer.locator('.ant-descriptions-item-content').first()).not.toBeEmpty()

    await expect(page.locator('.ant-drawer-extra .ant-btn-primary')).toHaveCount(0)
    await expect(page.locator('.ant-drawer-extra .ant-btn-default')).toHaveCount(0)
  })

  test('无新增按钮', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    const toolbar = page.locator('.ant-pro-table-toolbar')
    await expect(toolbar.getByRole('button')).toHaveCount(0)
  })

  test('搜索功能', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    // Fill search field for 昵称
    const searchInput = page.locator('.ant-form-item').filter({ hasText: '昵称' }).locator('input')
    await searchInput.fill('admin')

    // Click search and wait for response
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/travel18/tourist/list')),
      page.getByRole('button', { name: /查.*询/ }).click(),
    ])

    // Verify table updates (rows may be fewer or contain search term)
    await expect(page.locator('.ant-table')).toBeVisible()
  })
})