import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary text-sm"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
