import type { AxiosInstance } from 'axios'

function getAccessToken(): string | null {
  return null
}

export function attachAuthInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (!token) return config

    if (!config.headers) {
      config.headers = {} as typeof config.headers
    }
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
    return config
  })
}

