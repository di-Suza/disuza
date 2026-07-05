import { Component, type ErrorInfo, type ReactNode } from 'react';

import Button from '@/shared/ui/Button';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App render failed', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="state-page">
        <section className="state-panel">
          <p className="state-panel__eyebrow">Render error</p>
          <h1>Something broke while loading DevLoopFeed.</h1>
          <p>Refresh the app and try again.</p>
          <Button onClick={this.handleReload}>Refresh</Button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
