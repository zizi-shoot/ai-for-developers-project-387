import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUpcomingBookings } from './get-upcoming-bookings'

const validBooking = {
  booking: {
    id: 'booking-1',
    eventTypeId: 'event-type-1',
    startsAt: '2026-06-19T10:00:00.000Z',
    guestName: 'Анна Смирнова',
    guestEmail: 'anna@example.com',
  },
  eventType: {
    id: 'event-type-1',
    title: 'Консультация',
    durationMinutes: 30,
  },
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getUpcomingBookings', () => {
  it('возвращает валидный список встреч', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([validBooking])))

    await expect(getUpcomingBookings()).resolves.toEqual([validBooking])
  })

  it.each([
    ['ответ не является массивом', {}],
    [
      'поле имеет неверный тип',
      [{ ...validBooking, booking: { ...validBooking.booking, guestName: 42 } }],
    ],
    [
      'длительность не поддерживается',
      [{ ...validBooking, eventType: { ...validBooking.eventType, durationMinutes: 20 } }],
    ],
    [
      'дата не соответствует UTC ISO',
      [{ ...validBooking, booking: { ...validBooking.booking, startsAt: 'завтра' } }],
    ],
  ])('отклоняет некорректные данные: %s', async (_caseName, body) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body)))

    await expect(getUpcomingBookings()).rejects.toThrow('Сервер вернул некорректные данные.')
  })
})
