import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Last-resort guard around the application.
 *
 * React unmounts the whole tree when a render throws, which would leave the
 * user staring at a blank page with no way back. This catches that one case
 * and offers a reload instead.
 *
 * Deliberately narrow: it does not retry, log to a service, or attempt any
 * recovery beyond reloading. Everything the app can reasonably anticipate —
 * denied microphones, unreadable commands, corrupted storage — is already
 * handled where it happens, so anything reaching here is a genuine bug.
 *
 * A class component because error boundaries have no hook equivalent.
 */

interface ErrorBoundaryState {
  message: string | null
}

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      message: error instanceof Error ? error.message : 'Unexpected error',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry service in this project; the console is the only sink.
    console.error('Unhandled application error', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { message } = this.state
    if (message === null) return this.props.children

    return (
      <div className="crash" role="alert">
        <div className="empty">
          <p className="empty__title">Something went wrong</p>
          <p className="empty__text">
            The app hit an unexpected error and stopped. Your shopping list is
            saved in this browser, so reloading should bring it back.
          </p>
          <p className="crash__detail">{message}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={this.handleReload}
          >
            Reload the app
          </button>
        </div>
      </div>
    )
  }
}
