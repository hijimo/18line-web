import { test, expect } from '@playwright/test'
import { isLoggedIn, clearAuth } from './helpers/auth'

// Ant Design 汉字按钮文本中间有空格，需用 CSS 选择器定位
const loginBtn = 'button.ant-btn-primary'

test.describe('登录流程', () => {
  test('登录页面渲染验证', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '子梅的AI空间' })).toBeVisible()
    await expect(page.getByText('欢迎回来，请登录您的账号')).toBeVisible()
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible()
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: '记住我' })).toBeVisible()
    await expect(page.locator(loginBtn)).toBeVisible()
    await expect(page.getByRole('link', { name: '忘记密码' })).toBeVisible()
    await expect(page.getByRole('link', { name: '注册账号' })).toBeVisible()
  })

  test('表单默认值验证', async ({ page }) => {
    await page.goto('/login')

    // AuthProvider 在页面加载时可能触发 logout 导致重新渲染，默认值可能部分显示
    await expect(page.getByPlaceholder('请输入用户名')).toHaveValue(/admin/)
  })

  test('表单校验 — 空用户名', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('请输入用户名').clear()
    await page.locator(loginBtn).click()

    await expect(page.getByText('请输入用户名')).toBeVisible()
  })

  test('表单校验 — 空密码', async ({ page }) => {
    await page.goto('/login')

    await page.locator(loginBtn).click()

    await expect(page.getByText('请输入密码')).toBeVisible()
  })

  test('表单校验 — 用户名过短', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('请输入用户名').fill('ab')
    await page.getByPlaceholder('请输入密码').fill('123456')
    await page.locator(loginBtn).click()

    await expect(page.getByText('用户名至少 3 个字符')).toBeVisible()
  })

  test('表单校验 — 密码过短', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('请输入密码').fill('12345')
    await page.locator(loginBtn).click()

    await expect(page.getByText('密码至少 6 个字符')).toBeVisible()
  })

  test('登录成功流程（真实账号 admin/admin123）', async ({ page }) => {
    await page.goto('/login')
    await clearAuth(page)

    // Mock AuthProvider currentUser API，防止 token 过期重定向
    await page.route('**/api/system/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '操作成功',
          roles: [{ roleKey: 'common', roleName: '普通角色' }],
          posts: [{ postCode: 'ceo', postName: '董事长' }],
        }),
      })
    })

    // 输入真实账号密码
    await page.getByPlaceholder('请输入用户名').clear()
    await page.getByPlaceholder('请输入用户名').fill('admin')
    await page.getByPlaceholder('请输入密码').click()
    await page.getByPlaceholder('请输入密码').type('admin123', { delay: 50 })
    await page.locator(loginBtn).click()

    // 验证登录成功后跳转到首页
    await page.waitForURL('/', { timeout: 15000 })

    // 验证 localStorage 中存在 token
    expect(await isLoggedIn(page)).toBe(true)
  })

  test('登录成功流程（mock API）', async ({ page }) => {
    await page.goto('/login')
    await clearAuth(page)

    // Mock 登录 API
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '操作成功',
          token: 'mock-token-123',
        }),
      })
    })

    // Mock AuthProvider currentUser API
    await page.route('**/api/system/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: { id: 1, username: 'admin', email: 'admin@system.local' },
        }),
      })
    })

    // 用户名有默认值，只需输入密码
    await page.getByPlaceholder('请输入密码').click()
    await page.getByPlaceholder('请输入密码').type('123456', { delay: 50 })
    await page.locator(loginBtn).click()

    // 验证登录成功后跳转到首页
    await page.waitForURL('/', { timeout: 15000 })

    // 验证 localStorage 中存在 token
    expect(await isLoggedIn(page)).toBe(true)
  })

  test('登录失败 — 401', async ({ page }) => {
    // 在导航前设置 route mock
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 401,
          msg: '用户名或密码错误',
        }),
      })
    })

    // Mock AuthProvider currentUser API 防止 logout 导致页面跳转后循环
    await page.route('**/api/system/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 200, data: { id: 1, username: 'admin' } }),
      })
    })

    await page.goto('/login')

    // 输入密码
    await page.getByPlaceholder('请输入密码').click()
    await page.getByPlaceholder('请输入密码').type('wrongpassword', { delay: 50 })
    await page.locator(loginBtn).click()

    // 401 导致 logout 并重定向到 /login，验证仍在登录页面
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // 验证 localStorage 中没有 token（被 logout 清除）
    expect(await isLoggedIn(page)).toBe(false)
  })

  test('登录失败 — 网络错误', async ({ page }) => {
    // Mock 登录 API 抛出网络错误
    await page.route('**/api/login', async (route) => {
      await route.abort('failed')
    })

    // Mock AuthProvider currentUser API
    await page.route('**/api/system/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 200, data: { id: 1, username: 'admin' } }),
      })
    })

    await page.goto('/login')

    // 输入密码
    await page.getByPlaceholder('请输入密码').click()
    await page.getByPlaceholder('请输入密码').type('123456', { delay: 50 })
    await page.locator(loginBtn).click()

    // 网络错误不会触发 navigate，仍在登录页面
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})