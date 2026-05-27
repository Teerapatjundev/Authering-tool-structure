import type { Metadata } from 'next'
import '@/shared/styles/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Authoring Tool',
  description: 'Canvas Authoring Tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
