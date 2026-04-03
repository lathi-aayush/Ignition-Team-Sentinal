import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error(err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1 style={{ fontSize: 18 }}>Something went wrong</h1>
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
          <p style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
            Open the normal browser (Chrome/Edge) at <code>http://localhost:5173</code> if you are using an embedded
            preview that blocks wallet scripts.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
