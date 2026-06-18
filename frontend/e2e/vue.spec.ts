import { expect, test } from '@playwright/test'

test('владелец создаёт тип события', async ({ page }) => {
  let requestBody: unknown

  await page.route('http://127.0.0.1:4010/admin/event-types', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'event-type-1',
        title: 'Консультация',
        description: 'Обсудим задачу',
        durationMinutes: 30,
      }),
    })
  })

  await page.goto('/admin/event-types/new')
  await page.getByRole('textbox', { name: 'Название' }).fill('Консультация')
  await page.getByRole('textbox', { name: 'Описание' }).fill('Обсудим задачу')
  await page.getByRole('button', { name: 'Создать событие' }).click()

  await expect(page).toHaveURL(/\/admin\/event-types$/)
  await expect(page.getByText('Событие создано')).toBeVisible()
  expect(requestBody).toEqual({
    title: 'Консультация',
    description: 'Обсудим задачу',
    durationMinutes: 30,
  })
})
