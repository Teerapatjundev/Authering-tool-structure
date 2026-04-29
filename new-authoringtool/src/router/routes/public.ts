import type { RouteObject } from 'react-router-dom'
import { createElement } from 'react'
import { Navigate } from 'react-router-dom'

import { paths } from '@/constants'
import DashboardPage from '@/pages/DashboardPage'

export const publicRoutes: RouteObject[] = [
  { index: true, element: createElement(Navigate, { to: paths.dashboard, replace: true }) },
  { path: paths.dashboard, element: createElement(DashboardPage) },
]
