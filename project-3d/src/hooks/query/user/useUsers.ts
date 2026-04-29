import { useQuery } from '@tanstack/react-query'

import { getUsers } from '@/services/user.service'
import { userKeys } from './user.keys'

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => getUsers(),
  })
}

