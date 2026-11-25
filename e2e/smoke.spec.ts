import { expect, test } from '@playwright/test'

// The production build opens on a phone without errors. The voyage flow joins this test as the
// screens land (docs/design.md).
test('opens on a phone and shows the wordmark', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BOSUN' })).toBeVisible()
  expect(pageErrors).toEqual([])
})
