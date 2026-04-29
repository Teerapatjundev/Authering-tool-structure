import { useMutation } from '@tanstack/react-query'

export function useLogout() {
  return useMutation({
    mutationFn: async () => null,
  })
}

