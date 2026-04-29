import type { RouteObject } from 'react-router-dom'
import { createElement } from 'react'

import { paths } from '@/constants'
import CarsPage from '@/pages/CarsPage'
import EditorPage from '@/pages/EditorPage'
import FoodPage from '@/pages/FoodPage'
import UsersPage from '@/pages/UsersPage'

export const editorRoutes: RouteObject[] = [
  { path: paths.editor, element: createElement(EditorPage) },
  { path: paths.users, element: createElement(UsersPage) },
  { path: paths.cars, element: createElement(CarsPage) },
  { path: paths.food, element: createElement(FoodPage) },
]

