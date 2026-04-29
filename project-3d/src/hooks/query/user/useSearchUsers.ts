import { useQuery } from '@tanstack/react-query'

import { userKeys } from './user.keys'

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: [...userKeys.list(), 'search', query],
    queryFn: async () => [],
    enabled: query.trim().length > 0,
  })
}

