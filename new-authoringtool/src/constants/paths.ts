/** App route segments used by React Router */
export const paths = {
  home: '/',
  dashboard: '/dashboard',
  editor: '/editor/:docId',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]
