import { PROFILE_URL, expect, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`

test('the share card previews and downloads a PNG of the verdict', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Share card' }).click()
  const dialog = page.getByRole('dialog', { name: 'Share card' })
  const img = dialog.getByRole('img', { name: /Share card for Athrynas/ })
  await expect(img).toBeVisible()
  expect(await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])).toEqual([1200, 630])
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('link', { name: 'Download PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('athrynas-poe2-card.png')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Share card' })).toBeFocused()
})

test('what-if marks where a hit bar started', async ({ page }) => {
  await page.goto(importUrl)
  const panel = page.locator('#what-if')
  await expect(panel).toBeVisible({ timeout: 30_000 })
  await expect(panel.locator('.whatif-ghost')).toHaveCount(0)
  await page.getByRole('slider', { name: 'chaos resistance' }).fill('75')
  await expect(panel.locator('.whatif-ghost')).toHaveCount(1)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(panel.locator('.whatif-ghost')).toHaveCount(0)
})

test('a glossary term in a checklist step shows its definition and closes on Escape', async ({ page }) => {
  await page.goto('checklist/')
  const step = page.locator('details#step-atlas-rules')
  await step.evaluate((d: HTMLDetailsElement) => (d.open = true))
  const term = step.getByRole('button', { name: /Atlas points?/ }).first()
  await term.click()
  const tip = page.getByRole('tooltip').filter({ hasText: 'Atlas passive points' })
  await expect(tip).toBeVisible()
  await expect(term).toHaveAttribute('aria-expanded', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.keyboard.press('Escape')
  await expect(tip).toBeHidden()
})

test('an unknown address gets the site 404 with a way back', async ({ page }) => {
  const res = await page.goto('no-such-page/')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Off the Atlas/i)
  await page.getByRole('link', { name: /Checklist/ }).last().click()
  await expect(page).toHaveURL(/checklist\/?$/)
})

// A glossary term is a button: inside a summary, link, button or label it would be nested interactive content.
const nestedTerms = () =>
  [...document.querySelectorAll('.gloss-term')].filter((el) => el.parentElement?.closest('summary, a, button, label'))
    .length

test('glossary terms never sit inside another interactive element', async ({ page }) => {
  await page.goto('checklist/')
  await page.locator('details').evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)))
  expect(await page.locator('.gloss-term').count()).toBeGreaterThan(10)
  expect(await page.evaluate(nestedTerms)).toBe(0)

  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await page.locator('details').evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)))
  expect(await page.evaluate(nestedTerms)).toBe(0)
})

test('an open glossary tip follows its word when the page scrolls', async ({ page }) => {
  await page.goto('checklist/')
  const step = page.locator('details#step-atlas-rules')
  await step.evaluate((d: HTMLDetailsElement) => (d.open = true))
  const term = step.getByRole('button', { name: /Atlas points?/ }).first()
  await term.click()
  const tip = page.getByRole('tooltip').filter({ hasText: 'Atlas passive points' })
  await expect(tip).toBeVisible()
  await page.mouse.wheel(0, 40)
  await expect(tip).toBeVisible()
  await expect
    .poll(async () => (await tip.boundingBox())!.y - (await term.boundingBox())!.y)
    .toBeGreaterThan(0)
})
