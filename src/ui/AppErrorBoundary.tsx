import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] unrecoverable render error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fatal-state">
        <section className="paper" role="alert">
          <AlertTriangle size={24} aria-hidden="true" />
          <h1 className="paper-serif">The wardrobe could not open</h1>
          <p>Your locally stored pieces are still on this device.</p>
          <button type="button" className="btn btn-primary icon-text-button" onClick={() => window.location.reload()}>
            <RefreshCw size={14} aria-hidden="true" /> Reload wardrobe
          </button>
        </section>
      </main>
    )
  }
}
