import { ApiError, requestJson } from '@/shared/api'

import { eventDurations, type EventType } from '../model/types'

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

export async function getEventTypes(): Promise<EventType[]> {
  const eventTypes = await requestJson<unknown>('/event-types')

  if (!Array.isArray(eventTypes) || !eventTypes.every(isEventType)) {
    throw new ApiError('Сервер вернул некорректные данные типов событий.', 500)
  }

  return eventTypes
}
