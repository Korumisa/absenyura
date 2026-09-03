import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Props } from '@/types/errorBoundary';
import { State } from '@/types/errorBoundary';
import { getChunkLoadUserMessage } from '@/lib/http/errorMessage';

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
        <div className="min-h-screen bg-slate-50 bg-card flex flex-col items-center justify-center p-6">
          <div className="bg-card text-card-foreground max-w-md w-full rounded-2xl shadow-xl border border-border p-8 flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                isStaleBundle
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500'
              }`}
            >
              {isStaleBundle ? <WifiOff size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isStaleBundle ? 'Perlu Memuat Ulang' : 'Terjadi Kesalahan'}
            </h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {chunkMsg ??
                'Maaf, aplikasi mengalami masalah yang tidak terduga. Coba muat ulang halaman; jika masih terjadi, hubungi administrator.'}
            </p>
            {!isStaleBundle && import.meta.env.DEV && this.state.error?.message ? (
              <details className="mb-6 w-full text-left rounded-lg border border-border bg-slate-50 bg-card p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Detail teknis (mode pengembang)
                </summary>
                <code className="mt-2 block text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </code>
              </details>
            ) : null}
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 gap-2 font-semibold"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={18} /> Muat Ulang Halaman
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2 font-semibold"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                <Home size={18} /> Kembali ke Beranda
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class InnerRouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const chunkMsg = getChunkLoadUserMessage(this.state.error);
      const isStaleBundle = Boolean(chunkMsg);

      return (
        <div className="p-4">
          <div className="max-w-md mx-auto bg-card text-card-foreground rounded-xl border border-border p-6 flex flex-col items-center text-center">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                isStaleBundle
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500'
              }`}
            >
              {isStaleBundle ? <WifiOff size={28} /> : <AlertTriangle size={28} />}
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              {isStaleBundle ? 'Perlu Memuat Ulang' : 'Konten mengalami kendala'}
            </h2>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {chunkMsg ??
                'Bagian ini mengalami masalah. Navigasi sidebar dan menu utama tetap berfungsi.'}
            </p>
            {!isStaleBundle && import.meta.env.DEV && this.state.error?.message ? (
              <details className="mb-5 w-full text-left rounded-lg border border-border bg-slate-50 bg-card p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Detail teknis (mode pengembang)
                </summary>
                <code className="mt-2 block text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </code>
              </details>
            ) : null}
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 gap-2 font-semibold text-sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} /> Muat Ulang Halaman Ini
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2 font-semibold text-sm"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                <Home size={16} /> Ke Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
