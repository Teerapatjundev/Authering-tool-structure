import axios from 'axios'

import {
  attachAuthInterceptor,
  attachErrorInterceptor,
  attachLoggerInterceptor,
} from '@/libs/axios/interceptors'

export const api = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '',
  timeout: 30_000,
})

attachAuthInterceptor(api)
attachErrorInterceptor(api)
attachLoggerInterceptor(api)

