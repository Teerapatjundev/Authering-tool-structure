import { useMutation } from '@tanstack/react-query'

export function useCreateUser() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

