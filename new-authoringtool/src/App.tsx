import { RouterProvider } from 'react-router-dom'

import { QueryProvider } from '@/components/layout/providers'
import { router } from '@/router'

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}
