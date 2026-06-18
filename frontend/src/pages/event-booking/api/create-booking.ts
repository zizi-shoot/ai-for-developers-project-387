import { ApiError, requestJson } from '@/shared/api'

import type { Booking, CreateBookingRequest } from '../model/types'

function isBooking(value: unknown): value is Booking {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<Booking>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.eventTypeId === 'string' &&
    typeof candidate.startsAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.startsAt)) &&
    typeof candidate.guestName === 'string' &&
    typeof candidate.guestEmail === 'string'
  )
}

export async function createBooking(request: CreateBookingRequest): Promise<Booking> {
  const booking = await requestJson<unknown>('/bookings', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  if (!isBooking(booking)) {
    throw new ApiError('Сервер вернул некорректные данные бронирования.', 500)
  }

  return booking
}
