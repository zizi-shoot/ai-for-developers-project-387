export const eventDurations = [15, 30, 45, 60] as const

export type EventDurationMinutes = (typeof eventDurations)[number]

export interface CreateEventTypeRequest {
  title: string
  description: string
  durationMinutes: EventDurationMinutes
}

export interface EventType extends CreateEventTypeRequest {
  id: string
}
