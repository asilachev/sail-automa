import { expect, test, type Page } from '@playwright/test'

// The production build opens on a phone without errors. The voyage flow joins this test as the
// screens land (docs/design.md).
test('opens on a phone and shows the wordmark', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BOSUN' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

const title = (page: Page) => page.getByRole('heading', { level: 1 })

/** On a trick's screen: you take it with a tail against a cannon (no action), then the order. */
async function quietTrick(page: Page) {
  await page
    .getByRole('group', { name: 'Who took the trick?' })
    .getByRole('button', { name: 'You' })
    .tap()
  await page.getByRole('group', { name: 'Your card' }).getByRole('button', { name: 'Tail' }).tap()
  await page
    .getByRole('group', { name: 'Bosun’s card' })
    .getByRole('button', { name: 'Cannon' })
    .tap()
  await page.getByRole('button', { name: /^Done · / }).tap()
  await expect(title(page)).toContainText('THE ORDER')
  await page.getByRole('button', { name: /^Done · / }).tap()
}

// #7: a voyage at the table, from Set sail through round I, with Undo and a reload.
test('plays round I on a phone, undoes a step and resumes after a reload', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await page.goto('/')
  await page.getByRole('button', { name: 'New voyage' }).tap()
  await page.getByRole('button', { name: 'Next · set up the table' }).tap()
  // Tick every setup line; each tick takes a line off the list of unticked ones.
  const unticked = page.getByRole('checkbox', { checked: false })
  await expect(unticked).toHaveCount(9)
  for (let i = 9; i > 0; i--) {
    await unticked.first().tap()
    await expect(unticked).toHaveCount(i - 1)
  }
  await page.getByRole('button', { name: 'Set sail' }).tap()

  await expect(title(page)).toHaveText('ROUND I · THE EXCHANGE')
  await page.getByRole('button', { name: 'Exchange done · trick 1' }).tap()
  for (let i = 0; i < 4; i++) {
    await expect(title(page)).toHaveText(`TRICK ${i + 1} · YOU LEAD`)
    await quietTrick(page)
  }
  await expect(title(page)).toHaveText('ROUND I ENDS')

  await page.getByRole('button', { name: 'Undo', exact: true }).tap()
  await expect(page.getByText('Undone: trick 4')).toBeVisible()
  await expect(title(page)).toHaveText('TRICK 4 · THE ORDER')

  await page.reload()
  await page.getByRole('button', { name: 'Continue · Round I' }).tap()
  await expect(title(page)).toHaveText('TRICK 4 · THE ORDER')
  await page.getByRole('button', { name: 'Done · round end' }).tap()
  await expect(title(page)).toHaveText('ROUND I ENDS')
  await page.getByRole('button', { name: 'Next · round II' }).tap()
  await expect(title(page)).toHaveText('ROUND II · NEW DEAL')
  expect(pageErrors).toEqual([])
})
