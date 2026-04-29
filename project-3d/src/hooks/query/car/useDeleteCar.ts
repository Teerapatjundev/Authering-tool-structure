import { useMutation } from '@tanstack/react-query'

export function useDeleteCar() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Not implemented')
    },
  })
}

