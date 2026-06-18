export const eventDurations = [15, 30, 45, 60] as const

export type EventDurationMinutes = (typeof eventDurations)[number]

export interface Owner {
  id: string
  name: string
}

export interface EventType {
  id: string
  title: string
  description: string
  durationMinutes: EventDurationMinutes
}
