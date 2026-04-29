import { useQuery } from '@tanstack/react-query'

import { foodKeys } from './food.keys'

export function useFood(id: string) {
  return useQuery({
    queryKey: foodKeys.detail(id),
    queryFn: async () => null,
    enabled: Boolean(id),
  })
}

