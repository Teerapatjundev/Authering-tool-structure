import { useQuery } from '@tanstack/react-query'

import { getFoods } from '@/services/food.service'
import { foodKeys } from './food.keys'

export function useFoods() {
  return useQuery({
    queryKey: foodKeys.list(),
    queryFn: () => getFoods(),
  })
}

