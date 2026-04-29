import { Link } from 'react-router-dom'

import { paths } from '@/constants'

export default function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>Page not found.</p>
      <p>
        <Link to={paths.home}>Go home</Link>
      </p>
    </main>
  )
}

