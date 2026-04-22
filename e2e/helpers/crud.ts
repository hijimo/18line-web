import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    await page.goto('/login')

    await page.evaluate(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      localStorage.removeItem('auth-storage')
    })

    await page.getByPlaceholder('请输入用户名').clear()
    await page.getByPlaceholder('请输入用户名').fill('admin')
    await page.getByPlaceholder('请输入密码').click()
    await page.getByPlaceholder('请输入密码').fill('admin123')

    await page.locator('button.ant-btn-primary').click()

    await page.waitForURL('/', { timeout: 15000 })

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).not.toBeNull()

    await use(page)
  },
})

export { expect }

/** Navigate and wait for the list API response. Sets up listener before goto to avoid missing fast responses. */
export async function waitForTableLoad(page: Page, path: string, listApiPath: string) {
  const respPromise = page.waitForResponse(resp => resp.url().includes(listApiPath))
  await page.goto(path)
  await respPromise
}

/** Make a direct API call via the Vite proxy from the browser context. */
export async function apiRequest(page: Page, url: string, method: string = 'POST', body?: Record<string, unknown>): Promise<any> {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const result = await page.evaluate(async ({ url, method, body, token }) => {
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    if (body) opts.body = JSON.stringify(body)
    const resp = await fetch(`/api${url}`, opts)
    return resp.json()
  }, { url, method, body, token })
  return result
}

/** Create a record via API and return its ID. */
export async function createViaApi(page: Page, addUrl: string, fields: Record<string, unknown>): Promise<number | null> {
  const result = await apiRequest(page, addUrl, 'POST', fields)
  if (result.code !== 200) return null
  // After creating, find the record in the list to get its ID
  const listResult = await apiRequest(page, addUrl.replace('/add', '/list'), 'POST', { pageNum: 1, pageSize: 1000 })
  if (listResult.code !== 200 || !listResult.rows) return null
  // Find the record by matching a field value
  const nameField = Object.keys(fields).find(k => k.includes('Name') || k === 'nickname' || k === 'lineName')
  if (!nameField) return null
  const record = listResult.rows.find((r: any) => r[nameField] === fields[nameField])
  return record ? record[addUrl.replace('/travel18/', '').replace('/add', 'Id')] || record.id : null
}

/** Delete a record via API using query params format (ids=xxx). */
export async function deleteViaApi(page: Page, removeUrl: string, ids: string | number): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const result = await page.evaluate(async ({ url, ids, token }) => {
    const resp = await fetch(`/api${url}?ids=${ids}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return resp.json()
  }, { url: removeUrl, ids, token })
  return result.code === 200
}