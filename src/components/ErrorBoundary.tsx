import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Terjadi Kesalahan</h1>
            <p className="text-slate-600 dark:text-zinc-400 mb-6">
              Maaf, aplikasi mengalami masalah yang tidak terduga. Silakan muat ulang halaman ini.
            </p>
            <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-lg w-full text-left overflow-x-auto mb-8 border border-slate-200 dark:border-zinc-800">
              <code className="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown Error'}
              </code>
            </div>
            <Button 
              size="lg" 
              className="w-full gap-2 font-semibold"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} /> Muat Ulang Aplikasi
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
