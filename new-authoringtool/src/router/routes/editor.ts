import type { RouteObject } from 'react-router-dom'
import { createElement } from 'react'

import { paths } from '@/constants'
import EditorPage from '@/pages/EditorPage'

export const editorRoutes: RouteObject[] = [
  { path: paths.editor, element: createElement(EditorPage) },
]
