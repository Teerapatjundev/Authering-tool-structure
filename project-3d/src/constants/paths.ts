export const paths = {
  home: '/',
  dashboard: '/dashboard',
  login: '/login',
  users: '/users',
  cars: '/cars',
  food: '/food',
  editor: '/editor/:docId',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]

