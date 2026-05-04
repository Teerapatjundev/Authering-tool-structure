import axios from 'axios'

import {
  attachAuthInterceptor,
  attachErrorInterceptor,
  attachLoggerInterceptor,
} from '@/libs/axios/interceptors'

export const api = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] ?? '',
  timeout: 30_000,
})

attachAuthInterceptor(api)
attachErrorInterceptor(api)
attachLoggerInterceptor(api)

