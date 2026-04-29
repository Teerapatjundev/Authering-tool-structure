import type { RouteObject } from 'react-router-dom'

import { RootLayout } from '@/components/layout'
import NotFoundPage from '@/pages/NotFoundPage'
import { editorRoutes } from '@/router/routes/editor'
import { publicRoutes } from '@/router/routes/public'

export const rootRoute: RouteObject = {
  path: '/',
  element: <RootLayout />,
  children: [...publicRoutes, ...editorRoutes, { path: '*', element: <NotFoundPage /> }],
}

