import { ApiError, requestJson } from '@/shared/api'

import type { Slot } from '../model/types'

function isSlot(value: unknown): value is Slot {
  if (typeof value !== 'object' || value === null) return false

  const startsAt = (value as Partial<Slot>).startsAt
  return typeof startsAt === 'string' && startsAt.trim() !== '' && !Number.isNaN(Date.parse(startsAt))
}

export async function getEventTypeSlots(eventTypeId: string): Promise<Slot[]> {
  const slots = await requestJson<unknown>(`/event-types/${encodeURIComponent(eventTypeId)}/slots`)

  if (!Array.isArray(slots) || !slots.every(isSlot)) {
    throw new ApiError('Сервер вернул некорректные данные свободных слотов.', 500)
  }

  return slots
}
