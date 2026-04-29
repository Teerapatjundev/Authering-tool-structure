import { useQuery } from '@tanstack/react-query'

import { getCars } from '@/services/car.service'
import { carKeys } from './car.keys'

export function useCars() {
  return useQuery({
    queryKey: carKeys.list(),
    queryFn: () => getCars(),
  })
}

