import { Component, type ReactNode } from 'react'
import { clearSaved } from './store'

/** Keeps one broken page from blanking the whole app during a test session. */
export default class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty" role="alert">
        <h3>This page hit a snag</h3>
        <p>Your agents are fine. Go back to the Desk, or reset the demo if it keeps happening.</p>
        <div className="row">
          <a className="btn" href="#/">Back to the Desk</a>
          <button className="btn ghost" onClick={() => { clearSaved(); location.reload() }}>Reset the demo</button>
        </div>
        <p className="mono faint">{this.state.error.message}</p>
      </div>
    )
  }
}
