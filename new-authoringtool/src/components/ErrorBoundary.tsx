import type { ReactNode } from 'react'
import { Component } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <main>
          <h1>Something went wrong</h1>
        </main>
      )
    }

    return this.props.children
  }
}

