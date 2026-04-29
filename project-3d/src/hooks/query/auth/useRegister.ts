import { useMutation } from '@tanstack/react-query'

export function useRegister() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

