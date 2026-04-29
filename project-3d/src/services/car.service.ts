import { api } from '@/libs'

export async function getCars() {
  const res = await api.get('/cars')
  return res.data as unknown
}

