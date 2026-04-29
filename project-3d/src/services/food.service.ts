import { api } from '@/libs'

export async function getFoods() {
  const res = await api.get('/foods')
  return res.data as unknown
}

