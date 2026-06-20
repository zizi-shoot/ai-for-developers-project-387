import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatBookingTime } from '../model/booking-date'
import EventBookingPage from './EventBookingPage.vue'

const eventType = {
  id: 'event-type-1',
  title: 'Консультация',
  description: 'Обсудим задачу и следующие шаги.',
  durationMinutes: 30,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function futureSlot(hours = 10) {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hours, 0, 0, 0)
  return date.toISOString()
}

function requestPath(input: RequestInfo | URL) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
}

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Каталог</div>' } },
      { path: '/event-types/:eventTypeId', component: EventBookingPage },
    ],
  })
  await router.push('/event-types/event-type-1')
  await router.isReady()

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  })

  return render(EventBookingPage, {
    global: { plugins: [router, [VueQueryPlugin, { queryClient }], PrimeVue] },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('гостевое бронирование', () => {
  it('выбирает слот, валидирует данные и создаёт бронирование', async () => {
    const user = userEvent.setup()
    const startsAt = futureSlot()
    let requestBody: unknown
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input, init) => {
        const path = requestPath(input)
        if (path === '/event-types') return Promise.resolve(jsonResponse([eventType]))
        if (path.endsWith('/slots')) return Promise.resolve(jsonResponse([{ startsAt }]))

        requestBody = JSON.parse(String(init?.body))
        return Promise.resolve(
          jsonResponse({
            id: 'booking-1',
            ...(requestBody as object),
          }, 201),
        )
      }),
    )

    await renderPage()

    expect(await screen.findByRole('heading', { name: 'Консультация' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: formatBookingTime(startsAt) }))
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))
    expect(screen.getByText('Введите ваше имя')).toBeTruthy()
    expect(screen.getByText('Введите email')).toBeTruthy()

    await user.type(screen.getByRole('textbox', { name: 'Имя' }), '  Анна  ')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'anna@example.com')
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByRole('heading', { name: 'До встречи!' })).toBeTruthy()
    expect(requestBody).toEqual({
      eventTypeId: 'event-type-1',
      startsAt,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    })
  })

  it('при конфликте обновляет слоты и сохраняет данные гостя', async () => {
    const user = userEvent.setup()
    const startsAt = futureSlot()
    let slotsRequestCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input) => {
        const path = requestPath(input)
        if (path === '/event-types') return Promise.resolve(jsonResponse([eventType]))
        if (path.endsWith('/slots')) {
          slotsRequestCount += 1
          return Promise.resolve(jsonResponse([{ startsAt }]))
        }
        return Promise.resolve(jsonResponse({ code: 'SLOT_TAKEN', message: 'Слот занят' }, 409))
      }),
    )

    await renderPage()
    await user.click(await screen.findByRole('button', { name: formatBookingTime(startsAt) }))
    await user.type(screen.getByRole('textbox', { name: 'Имя' }), 'Анна')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'anna@example.com')
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByText(/Этот слот уже заняли/)).toBeTruthy()
    await waitFor(() => expect(slotsRequestCount).toBe(2))
    await user.click(screen.getByRole('button', { name: formatBookingTime(startsAt) }))
    expect(screen.getByRole('textbox', { name: 'Имя' })).toHaveProperty('value', 'Анна')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveProperty('value', 'anna@example.com')
  })

  it('показывает пустое состояние без доступных слотов', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input) => {
        const path = requestPath(input)
        return Promise.resolve(jsonResponse(path === '/event-types' ? [eventType] : []))
      }),
    )

    await renderPage()

    expect(await screen.findByText('Свободных слотов пока нет')).toBeTruthy()
  })

  it('показывает понятное состояние для неизвестного типа события', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input) => {
        const path = requestPath(input)
        return Promise.resolve(jsonResponse(path === '/event-types' ? [] : []))
      }),
    )

    await renderPage()

    expect(await screen.findByRole('heading', { name: 'Тип события не найден' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Вернуться к типам событий' })).toHaveLength(2)
  })
})
