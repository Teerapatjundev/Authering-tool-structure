import { useMutation } from '@tanstack/react-query'

export function useUpdateUser() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

