import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost } from '@/types/publicSite';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';

export default function BeritaDetail() {
  const { slug } = useParams();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: post, isLoading } = useSWR<PublicPost>(slug ? `/public-site/posts/${slug}` : null, fetcher, { revalidateOnFocus: false });

  return (
    <PublicLayout>
      <PublicEnter className="mx-auto max-w-4xl px-6 py-12">
        <Link to="/berita" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--public-primary)]">
          <ArrowLeft size={18} />
          Kembali ke Berita
        </Link>

        {isLoading ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_28px_70px_-52px_rgba(0,0,0,0.7)]">
            <Skeleton className="aspect-[16/8] w-full rounded-none" />
            <div className="p-7 md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="mt-5 h-9 w-4/5" />
              <Skeleton className="mt-3 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-11/12" />
              <Skeleton className="mt-2 h-5 w-10/12" />
            </div>
          </div>
        ) : !post ? (
          <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            Konten tidak ditemukan atau belum dipublikasikan.
          </div>
        ) : (
          <article className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_28px_70px_-52px_rgba(0,0,0,0.7)]">
            <div className="aspect-[16/8] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
              {post.cover_image_url ? <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-7 md:p-10">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                <span>{post.category?.name ?? 'Berita'}</span>
                {post.date_label ? <span className="text-slate-300 dark:text-slate-600">•</span> : null}
                {post.date_label ? <span className="normal-case tracking-normal">{post.date_label}</span> : null}
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {post.title}
              </h1>

              {post.excerpt ? (
                <p className="mt-5 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                  {post.excerpt}
                </p>
              ) : null}

              {post.content ? (
                <div className="mt-8 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                  {post.content}
                </div>
              ) : (
                <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
                  Konten detail belum diisi.
                </div>
              )}
            </div>
          </article>
        )}
      </PublicEnter>
    </PublicLayout>
  );
}

