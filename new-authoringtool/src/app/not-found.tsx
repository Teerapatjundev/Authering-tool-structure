import Link from 'next/link'
import { paths } from '@/constants'

export default function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p>Page not found.</p>
      <p>
        <Link href={paths.home}>Go home</Link>
      </p>
    </main>
  )
}
