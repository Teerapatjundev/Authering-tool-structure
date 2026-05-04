import type { AxiosInstance } from 'axios'

export function attachLoggerInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (import.meta.env.DEV) {
      // Keep logs lightweight by default.
      console.debug('[api] request', config.method?.toUpperCase(), config.url)
    }
    return config
  })
}

