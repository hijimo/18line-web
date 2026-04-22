import { test, expect, waitForTableLoad } from './helpers/crud'

const LIST_URL = '/travel18/easterEgg/list'

test.describe.configure({ mode: 'serial' })

test.describe('彩蛋', () => {
  test('页面渲染', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/easter-egg', LIST_URL)

    await expect(page.getByRole('columnheader', { name: '彩蛋主题' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '难度' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '奖品名称' })).toBeVisible()
    await expect(page.getByRole('button', { name: /彩蛋/ })).toBeVisible()
  })

  test.fixme('新增彩蛋 — 后端无API(404)', async ({ loggedInPage }) => {
    // Backend /travel18/easterEgg/add returns 404
  })

  test.fixme('编辑彩蛋 — 后端无API(404)', async ({ loggedInPage }) => {
    // Backend /travel18/easterEgg/edit returns 404
  })

  test.fixme('删除彩蛋 — 后端无API(404)', async ({ loggedInPage }) => {
    // Backend /travel18/easterEgg/remove returns 404
  })

  test('表单必填校验', async ({ loggedInPage }) => {
    const page = loggedInPage
    await waitForTableLoad(page, '/easter-egg', LIST_URL)

    await page.getByRole('button', { name: /彩蛋/ }).click()
    await page.locator('.ant-drawer-extra .ant-btn-primary').click()

    await expect(page.locator('.ant-drawer').getByText('请输入彩蛋主题')).toBeVisible()
  })
})