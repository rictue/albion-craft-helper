/**
 * Error boundary used both at the top level (full-page fallback) AND
 * around individual panels (compact fallback so a single crash doesn't
 * take down the surrounding calculator). Pass `compact` to switch to
 * the inline failure card; optional `label` is shown in the compact
 * variant so it's easy to spot WHICH panel died.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  compact?: boolean;
  label?: string;
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged so we can see it in dev tools / Render logs
    console.error('Caught by ErrorBoundary:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="bg-zinc-900 rounded-lg border border-red-500/30 p-3 text-xs">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-red-400 font-bold">
                {this.props.label ?? 'Panel'} failed to render
              </span>
              <button
                onClick={this.reset}
                className="px-2 py-0.5 bg-gold/15 border border-gold/30 rounded text-gold text-[10px] font-semibold hover:bg-gold/25"
              >
                Retry
              </button>
            </div>
            {this.state.error && (
              <pre className="bg-black/40 border border-zinc-800 rounded p-2 text-[10px] text-red-300/80 font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        );
      }
      return (
        <div className="max-w-[600px] mx-auto px-4 py-12">
          <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 text-xl">
                !
              </div>
              <h2 className="text-lg font-bold text-zinc-100">Something broke</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              This page hit an unexpected error. The rest of the site still works — try
              another page from the navigation.
            </p>
            {this.state.error && (
              <pre className="bg-black/40 border border-zinc-800 rounded-lg p-3 text-[11px] text-red-300 overflow-auto max-h-40 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={this.reset}
                className="px-4 py-2 bg-gold/10 border border-gold/20 rounded-lg text-gold text-xs font-semibold hover:bg-gold/20"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.assign('/'); this.reset(); }}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
