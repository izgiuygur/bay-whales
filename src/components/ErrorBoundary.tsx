import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log so anything wired up (Sentry, Plausible, console) sees it
    console.error("App error boundary caught:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-inner">
            <div className="error-boundary-icon" role="img" aria-label="whale">
              🐳
            </div>
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-text">
              The map ran into an unexpected error. Please reload the page to
              try again.
            </p>
            <button
              type="button"
              className="error-boundary-button"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
