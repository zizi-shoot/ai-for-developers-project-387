import { ApiError, requestJson } from '@/shared/api'

import { eventDurations, type CreateEventTypeRequest, type EventType } from '../model/types'

function isEventType(value: unknown): value is EventType {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<EventType>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    eventDurations.some((duration) => duration === candidate.durationMinutes)
  )
}

export async function createEventType(request: CreateEventTypeRequest): Promise<EventType> {
  const eventType = await requestJson<unknown>('/admin/event-types', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  if (!isEventType(eventType)) {
    throw new ApiError('Сервер вернул некорректные данные.', 500)
  }

  return eventType
}
