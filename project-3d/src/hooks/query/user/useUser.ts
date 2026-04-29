import { useQuery } from '@tanstack/react-query'

import { userKeys } from './user.keys'

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => null,
    enabled: Boolean(id),
  })
}

