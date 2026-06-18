import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'

import type { UpcomingBooking } from '../model/types'
import UpcomingBookingsPage from './UpcomingBookingsPage.vue'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  })
}

function renderPage(queryClient = createQueryClient()) {
  return render(UpcomingBookingsPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }], PrimeVue],
    },
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function localDate(dayOffset: number, hour: number, minute: number) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute)
}

function createBooking(
  id: string,
  startsAt: Date,
  overrides: Partial<UpcomingBooking['booking']> = {},
): UpcomingBooking {
  return {
    booking: {
      id,
      eventTypeId: 'event-type-1',
      startsAt: startsAt.toISOString(),
      guestName: 'Анна Смирнова',
      guestEmail: 'anna@example.com',
      ...overrides,
    },
    eventType: {
      id: 'event-type-1',
      title: 'Консультация',
      durationMinutes: 30,
    },
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('страница предстоящих встреч', () => {
  it('группирует встречи по локальным датам и показывает все данные', async () => {
    const todayBooking = createBooking('booking-1', localDate(0, 10, 15))
    const tomorrowBooking = createBooking('booking-2', localDate(1, 14, 0), {
      guestName: 'Пётр Иванов',
      guestEmail: 'petr@example.com',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([todayBooking, tomorrowBooking])),
    )

    renderPage()

    expect(await screen.findByText(/^Сегодня, /)).toBeTruthy()
    expect(screen.getByText(/^Завтра, /)).toBeTruthy()
    expect(screen.getAllByText('Консультация')).toHaveLength(2)
    expect(screen.getByText('10:15–10:45')).toBeTruthy()
    expect(screen.getAllByText('30 минут')).toHaveLength(2)
    expect(screen.getByText('Анна Смирнова')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'anna@example.com' }).getAttribute('href')).toBe(
      'mailto:anna@example.com',
    )
  })

  it('показывает skeleton во время первой загрузки', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(new Promise<Response>(() => {})))

    renderPage()

    expect(screen.getByLabelText('Загрузка предстоящих встреч')).toBeTruthy()
  })

  it('показывает пустое состояние без действия', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([])))

    renderPage()

    expect(await screen.findByText('Предстоящих встреч пока нет')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('показывает ошибку некорректного ответа и позволяет повторить запрос', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([{ booking: { id: 'broken' } }]))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Сервер вернул некорректные данные.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }))

    expect(await screen.findByText('Предстоящих встреч пока нет')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('сохраняет данные и показывает предупреждение при ошибке фонового обновления', async () => {
    const booking = createBooking('booking-1', localDate(0, 10, 0))
    let rejectRefresh: ((reason?: unknown) => void) | undefined
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([booking]))
      .mockReturnValueOnce(
        new Promise<Response>((_resolve, reject) => {
          rejectRefresh = reject
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()

    const firstRender = renderPage(queryClient)
    expect(await screen.findByText('Консультация')).toBeTruthy()
    firstRender.unmount()

    renderPage(queryClient)
    expect(screen.getByText('Консультация')).toBeTruthy()
    expect(await screen.findByText('Обновляем…')).toBeTruthy()

    rejectRefresh?.(new Error('network error'))

    expect(
      await screen.findByText('Не удалось обновить список. Показаны ранее загруженные данные.'),
    ).toBeTruthy()
    expect(screen.getByText('Консультация')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})
