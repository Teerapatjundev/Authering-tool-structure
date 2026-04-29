import { useMutation } from '@tanstack/react-query'

import type { LoginDto } from '@/services/auth.service'
import { login } from '@/services/auth.service'

export function useLogin() {
  return useMutation({
    mutationFn: (dto: LoginDto) => login(dto),
  })
}

