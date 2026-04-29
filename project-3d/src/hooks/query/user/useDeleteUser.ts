import { useMutation } from '@tanstack/react-query'

export function useDeleteUser() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

