import { api } from '@/libs'

export async function getUsers() {
  const res = await api.get('/users')
  return res.data as unknown
}

