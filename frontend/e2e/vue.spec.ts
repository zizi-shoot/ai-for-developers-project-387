import { expect, test } from '@playwright/test'
import { mockApiRoute } from './mock-api.js'

test('гость просматривает публичные типы событий', async ({ page }) => {
  await mockApiRoute(page, '/owner', 'GET', () => ({
    status: 200,
    json: { id: 'owner-1', name: 'Анна Смирнова' },
  }))
  await mockApiRoute(page, '/event-types', 'GET', () => ({
    status: 200,
    json: [
      {
        id: 'event-type-1',
        title: 'Консультация',
        description: 'Обсудим задачу и следующие шаги.',
        durationMinutes: 30,
      },
      {
        id: 'event-type-2',
        title: 'Разбор проекта',
        description: 'Посмотрим на архитектуру проекта.',
        durationMinutes: 60,
      },
    ],
  }))

  await page.goto('/')

  await expect(page.getByText('Анна Смирнова')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Выберите тип события', level: 1 })).toBeVisible()
  await expect(page.getByText('Консультация')).toBeVisible()
  await expect(page.getByText('30 мин')).toBeVisible()
  await expect(page.getByText('Разбор проекта')).toBeVisible()
  await expect(page.getByText('60 мин')).toBeVisible()
})

test('гость выбирает слот и создаёт бронирование', async ({ page }) => {
  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + 1)
  startsAt.setHours(10, 0, 0, 0)
  let requestBody: Record<string, string> | undefined

  await mockApiRoute(page, '/event-types', 'GET', () => ({
    status: 200,
    json: [
      {
        id: 'event-type-1',
        title: 'Консультация',
        description: 'Обсудим задачу и следующие шаги.',
        durationMinutes: 30,
      },
    ],
  }))
  await mockApiRoute(page, '/event-types/event-type-1/slots', 'GET', () => ({
    status: 200,
    json: [{ startsAt: startsAt.toISOString() }],
  }))
  await mockApiRoute(page, '/bookings', 'POST', (route) => {
    requestBody = route.request().postDataJSON() as Record<string, string>
    return {
      status: 201,
      json: { id: 'booking-1', ...requestBody },
    }
  })

  await page.goto('/')
  await page.getByRole('link', { name: /Консультация/ }).click()
  await expect(page).toHaveURL(/\/event-types\/event-type-1$/)
  await page.getByRole('button', { name: /10:00/ }).click()
  await page.getByRole('textbox', { name: 'Имя' }).fill('Анна')
  await page.getByRole('textbox', { name: 'Email' }).fill('anna@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByRole('heading', { name: 'До встречи!' })).toBeVisible()
  await expect(page.getByText('anna@example.com')).toBeVisible()
  expect(requestBody).toEqual({
    eventTypeId: 'event-type-1',
    startsAt: startsAt.toISOString(),
    guestName: 'Анна',
    guestEmail: 'anna@example.com',
  })
})

test('владелец создаёт тип события', async ({ page }) => {
  let requestBody: unknown

  await mockApiRoute(page, '/admin/event-types', 'GET', () => ({
    status: 200,
    json: [
      {
        id: 'event-type-1',
        title: 'Консультация',
        description: 'Обсудим задачу',
        durationMinutes: 30,
      },
    ],
  }))

  await mockApiRoute(page, '/admin/event-types', 'POST', (route) => {
    requestBody = route.request().postDataJSON()
    return {
      status: 201,
      json: {
        id: 'event-type-1',
        title: 'Консультация',
        description: 'Обсудим задачу',
        durationMinutes: 30,
      },
    }
  })

  await page.goto('/admin/event-types/new')
  await page.getByRole('textbox', { name: 'Название' }).fill('Консультация')
  await page.getByRole('textbox', { name: 'Описание' }).fill('Обсудим задачу')
  await page.getByRole('button', { name: 'Создать событие' }).click()

  await expect(page).toHaveURL(/\/admin\/event-types$/)
  await expect(page.getByText('Событие создано')).toBeVisible()
  await expect(page.getByText('Консультация')).toBeVisible()
  await expect(page.getByText('30 мин')).toBeVisible()
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

  await mockApiRoute(page, '/admin/bookings/upcoming', 'GET', () => ({
    status: 200,
    json: [
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
    ],
  }))

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
