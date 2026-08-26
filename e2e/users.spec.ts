import { test, expect, waitForTableLoad } from './helpers/crud'

const LIST_URL = '/system/user/list'

test.describe.configure({ mode: 'serial' })

test.describe('用户管理（系统用户）', () => {
  test('页面渲染：包含区域列且编码渲染为中文名', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    await expect(page.getByRole('columnheader', { name: '用户名' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '区域' })).toBeVisible()

    // 测试账号 syline 的 region_code=331124，应渲染为松阳县
    await expect(page.getByRole('cell', { name: '松阳县' })).toBeVisible({ timeout: 15000 })
  })

  test('新增抽屉：省/市/区三级联动加载', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/users', LIST_URL)

    await page.getByRole('button', { name: /添加用户/ }).click()
    await expect(page.locator('.ant-drawer-title')).toHaveText('新增用户')

    // 抽屉内下拉顺序：性别、状态、省、市、区
    const drawer = page.locator('.ant-drawer')

    // 角色多选项已加载
    await expect(drawer.getByText('角色')).toBeVisible()
    await drawer.getByRole('combobox').nth(2).click()
    await expect(
      page.locator('.ant-select-dropdown:visible').getByTitle('区域管理员'),
    ).toBeVisible({ timeout: 15000 })

    // 选省份 → 加载城市
    await drawer.getByRole('combobox').nth(3).click()
    await page.locator('.ant-select-dropdown:visible').getByTitle('浙江省').click()

    // 选城市 → 加载区县
    await drawer.getByRole('combobox').nth(4).click()
    await page.locator('.ant-select-dropdown:visible').getByTitle('丽水市').click()

    // 区县下拉包含松阳县（只验证加载，不提交，避免产生脏数据）
    await drawer.getByRole('combobox').nth(5).click()
    await expect(
      page.locator('.ant-select-dropdown:visible').getByTitle('松阳县'),
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /取\s*消/ }).click()
  })
})

test.describe('region 账号菜单可见性', () => {
  test('非 admin 登录不显示算法配置/数据字典，直接访问受控路由被重定向', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      localStorage.removeItem('auth-storage')
    })

    await page.getByPlaceholder('请输入用户名').fill('syline')
    await page.getByPlaceholder('请输入密码').fill('18line')
    await page.locator('button.ant-btn-primary').click()
    await page.waitForURL('/', { timeout: 15000 })

    const menu = page.locator('.ant-menu')
    await expect(menu).toContainText('景点管理')
    await expect(menu).not.toContainText('用户管理')
    await expect(menu).not.toContainText('算法配置')
    await expect(menu).not.toContainText('数据字典')

    await page.goto('/algorithm-config')
    await page.waitForURL('/', { timeout: 15000 })

    await page.goto('/users')
    await page.waitForURL('/', { timeout: 15000 })
  })
})
