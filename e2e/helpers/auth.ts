import type { Page } from '@playwright/test'

/**
 * 检查是否已登录（localStorage 中是否存在 token）
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  return token !== null
}

/**
 * 清除认证状态 — 在页面加载后调用
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_info')
    localStorage.removeItem('auth-storage')
  })
}