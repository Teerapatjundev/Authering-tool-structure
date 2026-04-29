import type { AxiosError, AxiosInstance } from 'axios'

export function attachErrorInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      return Promise.reject(error)
    },
  )
}

