import { useMutation } from '@tanstack/vue-query'

import { createEventType } from '../api/create-event-type'

export function useCreateEventType() {
  return useMutation({
    mutationFn: createEventType,
  })
}
