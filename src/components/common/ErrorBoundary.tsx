import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-screen bg-surface-950 p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-danger-600/15 border border-danger-500/20 mx-auto">
              <AlertTriangle className="w-8 h-8 text-danger-400" />
            </div>
            <h2 className="text-xl font-bold text-surface-100">Something went wrong</h2>
            <p className="text-sm text-surface-400">
              An unexpected error occurred. Your data is safe in IndexedDB.
            </p>
            {this.state.error && (
              <pre className="mt-3 p-3 rounded-lg bg-surface-900 border border-surface-700/50 text-xs text-danger-300 font-mono text-left max-h-32 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-all mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
