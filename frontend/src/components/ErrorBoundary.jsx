import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary] Intercepted runtime rendering crash:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Neon cyber background glow */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-400 animate-pulse">
              <AlertOctagon size={48} className="drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400">
                System Interface Intercepted
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                NutriChain's safety decoupler prevented a critical interface crash. A dashboard rendering sub-routine encountered an unhandled exception.
              </p>
            </div>
            
            {this.state.error && (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-left overflow-x-auto max-h-[150px] scrollbar-thin scrollbar-thumb-slate-800">
                <code className="text-xs text-red-300 font-mono break-all whitespace-pre-wrap">
                  {this.state.error.stack || this.state.error.toString()}
                </code>
              </div>
            )}
            
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white rounded-lg font-semibold text-sm shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all duration-300 group"
            >
              <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              Re-Initialize Module
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
