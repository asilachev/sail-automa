import { expect, test } from '@playwright/test'

// The production build opens on a phone without errors. The voyage flow joins this test as the
// screens land (docs/design.md).
test('opens Home on a phone: the wordmark and the first-visit start button', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BOSUN', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Play Sail solo.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start your first voyage' })).toBeVisible()
  expect(pageErrors).toEqual([])
})
