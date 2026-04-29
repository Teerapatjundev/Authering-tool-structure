import { useQuery } from '@tanstack/react-query'

import { authKeys } from './auth.keys'

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async () => null,
  })
}

