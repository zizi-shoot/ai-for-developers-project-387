import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBooking } from './create-booking'
import { getEventTypeSlots } from './get-event-type-slots'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('API гостевого бронирования', () => {
  it('принимает корректные слоты и отклоняет дату неверного формата', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([{ startsAt: '2030-05-10T09:00:00Z' }]))
      .mockResolvedValueOnce(jsonResponse([{ startsAt: 'завтра утром' }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEventTypeSlots('event/type')).resolves.toEqual([
      { startsAt: '2030-05-10T09:00:00Z' },
    ])
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/event-types/event%2Ftype/slots')
    await expect(getEventTypeSlots('event/type')).rejects.toThrow(
      'Сервер вернул некорректные данные свободных слотов.',
    )
  })

  it('отправляет запрос и валидирует созданное бронирование', async () => {
    const request = {
      eventTypeId: 'event-type-1',
      startsAt: '2030-05-10T09:00:00Z',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'booking-1', ...request }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'broken' }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createBooking(request)).resolves.toEqual({ id: 'booking-1', ...request })
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(request),
    })
    await expect(createBooking(request)).rejects.toThrow(
      'Сервер вернул некорректные данные бронирования.',
    )
  })
})
