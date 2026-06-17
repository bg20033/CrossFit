import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // In production this would go to an error-reporting service (Sentry, etc.)
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900">Diçka shkoi keq</h1>
          <p className="max-w-sm text-sm text-gray-500">Ndodhi një gabim i papritur. Provo të rifreskosh faqen.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
          >
            Rifresko
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
