import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Props } from '@/types/errorboundry'
import { State } from '@/types/errorboundry'
import { getChunkLoadUserMessage } from '@/lib/errorMessage';

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
      const chunkMsg = getChunkLoadUserMessage(this.state.error);
      const isStaleBundle = Boolean(chunkMsg);

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                isStaleBundle
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500'
              }`}
            >
              {isStaleBundle ? <WifiOff size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {isStaleBundle ? 'Perlu Memuat Ulang' : 'Terjadi Kesalahan'}
            </h1>
            <p className="text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {chunkMsg ??
                'Maaf, aplikasi mengalami masalah yang tidak terduga. Coba muat ulang halaman; jika masih terjadi, hubungi administrator.'}
            </p>
            {!isStaleBundle && import.meta.env.DEV && this.state.error?.message ? (
              <details className="mb-6 w-full text-left rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-500">
                  Detail teknis (mode pengembang)
                </summary>
                <code className="mt-2 block text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </code>
              </details>
            ) : null}
            <Button
              size="lg"
              className="w-full gap-2 font-semibold"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} /> Muat Ulang Halaman
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
