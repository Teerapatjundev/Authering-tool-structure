import { useQuery } from '@tanstack/react-query'

import { carKeys } from './car.keys'

export function useCar(id: string) {
  return useQuery({
    queryKey: carKeys.detail(id),
    queryFn: async () => null,
    enabled: Boolean(id),
  })
}

