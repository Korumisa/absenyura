import React, { useEffect, useLayoutEffect } from 'react';
import PublicLayout from '@/components/PublicLayout';
import type { PublicPost, PublicProfile } from '@/types/publicSite';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicCoverImage from '@/components/PublicCoverImage';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockAllPosts, mockProfile } from '@/lib/utils/mockLandingData';
import { PublicPageError } from '@/components/public/PublicPageError';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { publicSiteFetcher } from '@/lib/utils/publicSiteFetcher';

const SCROLL_RESTORE_KEY = 'berita-detail-scroll-y';

export default function BeritaDetail() {
  const { slug } = useParams();
  const profileResult = useMockOrSwr<PublicProfile | null>({
    swrKey: '/public-site/profile',
    fetcher: publicSiteFetcher<PublicProfile | null>,
    mockStatic: mockProfile,
  });
  const profile = profileResult.data ?? null;
  const { swr, data: post, isInitialLoading: isLoading, isError, retry } = useMockOrSwr<PublicPost | null>({
    swrKey: slug ? `/public-site/posts/${slug}` : null,
    fetcher: publicSiteFetcher<PublicPost | null>,
    mockStatic: slug ? mockAllPosts.find((p) => p.slug === slug) ?? null : null,
  });
  const orgName = profile?.org_name ?? '';

  useLayoutEffect(() => {
    const saved = Number(sessionStorage.getItem(SCROLL_RESTORE_KEY) || 0);
    if (saved > 0) {
      window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
      sessionStorage.removeItem(SCROLL_RESTORE_KEY);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [slug]);

  useEffect(() => {
    const save = () => sessionStorage.setItem(SCROLL_RESTORE_KEY, String(window.scrollY));
    window.addEventListener('beforeunload', save);
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  if (isError) {
    return <PublicPageError title="Gagal memuat berita" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={isLoading} label="Memuat berita..." />
      <PublicEnter className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/berita" className="inline-flex items-center gap-2 rounded-xl border border-[var(--public-primary)]/20 bg-[var(--public-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--public-primary)] transition hover:bg-[var(--public-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45">
          <ArrowLeft size={18} />
          Kembali ke Berita
        </Link>

        {isLoading ? (
          <div className="mt-8">
            <Skeleton className="h-[220px] w-full rounded-3xl sm:h-[320px] lg:h-[440px]" />
            <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-black/10 bg-white p-7 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.45)] md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="mt-5 h-9 w-4/5" />
              <Skeleton className="mt-5 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-11/12" />
              <Skeleton className="mt-2 h-5 w-10/12" />
            </div>
          </div>
        ) : !post ? (
          <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-sm text-muted-foreground sm:p-8">
            Konten tidak ditemukan atau belum dipublikasikan.
          </div>
        ) : (
          <article className="mx-auto mt-8 w-full max-w-5xl">
            <header className="text-center">
              <h1 className="mx-auto max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--public-primary)] sm:text-4xl md:text-5xl">
                {post.title}
              </h1>
              <div className="mt-5 text-base font-semibold text-slate-700">
                {orgName ? `Tim Publikasi ${orgName}` : 'Tim Publikasi'}
                <span className="mx-2 text-slate-300">-</span>
                <span className="text-[var(--public-primary)]">{post.category?.name ?? 'Berita'}</span>
              </div>
              {post.date_label ? (
                <div className="mt-3 text-sm text-muted-foreground">{post.date_label}</div>
              ) : null}
            </header>

            <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div
                className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]"
                style={{ aspectRatio: '16 / 10' }}
              >
                <PublicCoverImage url={post.cover_image_url} alt={post.title} imgClassName="object-cover" />
              </div>
            </div>

            {post.excerpt ? (
              <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </div>
            ) : null}

            {post.content ? (
              <div className="mt-8 break-words whitespace-pre-wrap text-[18px] leading-9 text-slate-900">
                {post.content}
              </div>
            ) : (
              <div className="mt-8 text-sm text-muted-foreground">Konten detail belum diisi.</div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-6">
              <div className="text-sm text-muted-foreground">
                Baca berita lainnya untuk update terbaru {orgName || 'organisasi'}.
              </div>
              <Link
                to="/berita"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--public-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
              >
                Lihat daftar berita
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        )}
      </PublicEnter>
    </PublicLayout>
  );
}

