import { api } from '@/libs'

export type LoginDto = { username: string; password: string }

export async function login(dto: LoginDto) {
  const res = await api.post('/auth/login', dto)
  return res.data as unknown
}

