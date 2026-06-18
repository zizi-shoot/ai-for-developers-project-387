import { expect, test } from '@playwright/test'

test('владелец создаёт тип события', async ({ page }) => {
  let requestBody: unknown

  await page.route('http://127.0.0.1:4010/admin/event-types', async (route) => {
    const request = route.request()
    const corsHeaders = {
      'Access-Control-Allow-Origin': request.headers().origin ?? '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Мок воспроизводит CORS-ответ API для preflight и фактического POST-запроса.
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    if (request.method() !== 'POST') {
      await route.fulfill({ status: 405, headers: corsHeaders })
      return
    }

    requestBody = request.postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: corsHeaders,
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

test('владелец просматривает сгруппированные предстоящие встречи', async ({ page }) => {
  const meetingDate = new Date()
  meetingDate.setDate(meetingDate.getDate() + 1)
  meetingDate.setHours(10, 0, 0, 0)
  const secondMeetingDate = new Date(meetingDate)
  secondMeetingDate.setHours(12, 30, 0, 0)

  await page.route('http://127.0.0.1:4010/admin/bookings/upcoming', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          booking: {
            id: 'booking-1',
            eventTypeId: 'event-type-1',
            startsAt: meetingDate.toISOString(),
            guestName: 'Анна Смирнова',
            guestEmail: 'anna@example.com',
          },
          eventType: {
            id: 'event-type-1',
            title: 'Консультация',
            durationMinutes: 30,
          },
        },
        {
          booking: {
            id: 'booking-2',
            eventTypeId: 'event-type-2',
            startsAt: secondMeetingDate.toISOString(),
            guestName: 'Пётр Иванов',
            guestEmail: 'petr@example.com',
          },
          eventType: {
            id: 'event-type-2',
            title: 'Разбор проекта',
            durationMinutes: 60,
          },
        },
      ]),
    })
  })

  await page.goto('/admin/bookings/upcoming')

  await expect(page.getByRole('heading', { name: 'Предстоящие встречи', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1)
  await expect(page.getByText('Консультация')).toBeVisible()
  await expect(page.getByText('Разбор проекта')).toBeVisible()
  await expect(page.getByRole('link', { name: 'anna@example.com' })).toHaveAttribute(
    'href',
    'mailto:anna@example.com',
  )
})
