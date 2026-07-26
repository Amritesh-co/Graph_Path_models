import React from "react";

/**
 * Catches render failures inside the 3D canvas.
 *
 * Without this, anything that throws during a WebGL render — an unsupported
 * context, a driver problem, a bad graph — unmounts the whole React tree and
 * leaves a blank page with no explanation.
 */
export default class ViewerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Loading a different graph should clear a previous failure.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="viewer viewer--empty" style={{ height: this.props.height }}>
          <div>
            <p>The 3D view could not be rendered.</p>
            <p className="viewer__errordetail">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
