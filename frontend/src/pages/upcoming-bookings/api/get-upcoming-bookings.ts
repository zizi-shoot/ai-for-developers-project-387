import { ApiError, requestJson } from '@/shared/api'

import type { EventDurationMinutes, UpcomingBooking } from '../model/types'

const eventDurations: EventDurationMinutes[] = [15, 30, 45, 60]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

function isUpcomingBooking(value: unknown): value is UpcomingBooking {
  if (!isRecord(value) || !isRecord(value.booking) || !isRecord(value.eventType)) return false

  const { booking, eventType } = value
  return (
    typeof booking.id === 'string' &&
    typeof booking.eventTypeId === 'string' &&
    isValidDateTime(booking.startsAt) &&
    typeof booking.guestName === 'string' &&
    typeof booking.guestEmail === 'string' &&
    typeof eventType.id === 'string' &&
    typeof eventType.title === 'string' &&
    eventDurations.some((duration) => duration === eventType.durationMinutes)
  )
}

export async function getUpcomingBookings(): Promise<UpcomingBooking[]> {
  const bookings = await requestJson<unknown>('/admin/bookings/upcoming')

  if (!Array.isArray(bookings) || !bookings.every(isUpcomingBooking)) {
    throw new ApiError('Сервер вернул некорректные данные.', 500)
  }

  return bookings
}
