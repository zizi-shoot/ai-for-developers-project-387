import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { createBooking } from '../api/create-booking'
import { getEventType } from '../api/get-event-type'
import { getEventTypeSlots } from '../api/get-event-type-slots'

export const eventTypeQueryKey = (eventTypeId: string) => ['public', 'event-type', eventTypeId] as const
export const eventTypeSlotsQueryKey = (eventTypeId: string) =>
  ['public', 'event-type', eventTypeId, 'slots'] as const

export function useEventType(eventTypeId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => eventTypeQueryKey(toValue(eventTypeId))),
    queryFn: () => getEventType(toValue(eventTypeId)),
    refetchOnWindowFocus: true,
  })
}

export function useEventTypeSlots(eventTypeId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => eventTypeSlotsQueryKey(toValue(eventTypeId))),
    queryFn: () => getEventTypeSlots(toValue(eventTypeId)),
    refetchOnWindowFocus: true,
  })
}

export function useCreateBooking(eventTypeId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: eventTypeSlotsQueryKey(toValue(eventTypeId)) }),
  })
}
