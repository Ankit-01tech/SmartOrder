import React, { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-red-100 shadow-card p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-poppins font-bold text-lg mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}
            className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-indigo-700 transition-all">
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
export default ErrorBoundary;
