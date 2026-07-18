import { Component, type ErrorInfo, type ReactNode } from 'react';

import Button from '@/shared/ui/Button';
import './ErrorBoundary.css';

type ErrorBoundaryProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  resetKeys?: readonly unknown[];
  showReload?: boolean;
  title?: string;
  variant?: 'page' | 'section' | 'inline';
};

type ErrorBoundaryState = {
  errorId: number;
  hasError: boolean;
};

const haveResetKeysChanged = (previousKeys: readonly unknown[] = [], nextKeys: readonly unknown[] = []) => {
  if (previousKeys.length !== nextKeys.length) return true;
  return previousKeys.some((key, index) => !Object.is(key, nextKeys[index]));
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    errorId: 0,
    hasError: false,
  };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return;
    if (!haveResetKeysChanged(previousProps.resetKeys, this.props.resetKeys)) return;
    this.handleReset();
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`${this.props.title || 'UI render'} failed`, error, info);
  }

  handleReset = (): void => {
    this.setState((state) => ({ errorId: state.errorId + 1, hasError: false }));
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const {
      className,
      description = 'Try again. If the issue continues, refresh the page.',
      eyebrow = 'Render error',
      showReload,
      title = 'Something broke in this area.',
      variant = 'page',
    } = this.props;
    const shouldShowReload = showReload ?? variant === 'page';
    const rootClassName = ['error-boundary', `error-boundary--${variant}`, className].filter(Boolean).join(' ');
    const panel = (
      <section className="error-boundary__panel" key={this.state.errorId}>
        <p className="error-boundary__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="error-boundary__actions">
          <Button variant="secondary" onClick={this.handleReset}>Try again</Button>
          {shouldShowReload && <Button onClick={this.handleReload}>Refresh</Button>}
        </div>
      </section>
    );

    if (variant === 'page') return <main className={rootClassName}>{panel}</main>;

    return <div className={rootClassName}>{panel}</div>;
  }
}

export default ErrorBoundary;
