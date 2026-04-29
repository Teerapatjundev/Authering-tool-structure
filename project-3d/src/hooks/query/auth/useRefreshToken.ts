import { useMutation } from '@tanstack/react-query'

export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

