import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Last line of defence: any uncaught render error used to leave the user
 * staring at a blank white page with no hint that anything went wrong.
 * Now they get an explanation and a way out.
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private reload = () => {
    sessionStorage.removeItem('coursbit:chunk-reloaded');
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-base px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <svg className="h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-semibold text-white">Something went wrong</h1>
          <p className="mb-6 text-sm leading-relaxed text-prose">
            This page failed to load. It is usually a temporary glitch after an
            update — reloading fixes it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={this.reload}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Reload page
            </button>
            <a
              href="/dashboard"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-prose transition-colors hover:text-white"
            >
              Back to dashboard
            </a>
          </div>
          <p className="mt-6 break-words text-xs text-prose/50">{error.message}</p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
