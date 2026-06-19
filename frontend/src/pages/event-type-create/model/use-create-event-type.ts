import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createEventType } from '../api/create-event-type'

export function useCreateEventType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEventType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'event-types'] })
    },
  })
}
