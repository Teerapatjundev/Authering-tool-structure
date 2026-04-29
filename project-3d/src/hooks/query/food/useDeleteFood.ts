import { useMutation } from '@tanstack/react-query'

export function useDeleteFood() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

