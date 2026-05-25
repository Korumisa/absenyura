import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, Mail, Phone, User } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as AppUser } from '@/types/user';
import { formatClassLabel } from '@/lib/classLabel';
import { userRoleLabel } from '@/lib/statusLabel';

type EnrollmentRow = { id: string; name: string; semester: number };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

export default function StudentDetail() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const backTo =
    (location.state as { from?: string } | null)?.from ||
    (location.state as { classId?: string } | null)?.classId
      ? `/classes/${(location.state as { classId: string }).classId}`
      : '/classes';

  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);

  const profileSwr = useSWR<AppUser>(studentId ? `/users/${studentId}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: profile, isInitialLoading, isError, retry, error } = useSwrPageState(profileSwr);

  const enrollSwr = useSWR<EnrollmentRow[]>(
    studentId && profile?.role === 'USER' ? `/users/${studentId}/enrollments` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: enrollments = [], isInitialLoading: loadingClasses } = useSwrPageState(enrollSwr);

  if (!studentId) {
    return (
      <AdminPageShell title="Mahasiswa tidak ditemukan" variant="plain">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          Kembali
        </Button>
      </AdminPageShell>
    );
  }

  if (isError && !profile) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <AdminPageShell title="Biodata Mahasiswa" variant="plain">
        <ErrorWithRetry
          title={status === 403 ? 'Anda tidak memiliki akses' : 'Gagal memuat data mahasiswa'}
          error={profileSwr.error}
          onRetry={retry}
        />
        <Button variant="outline" className="mt-4" onClick={() => navigate(backTo)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </AdminPageShell>
    );
  }

  const enrolledDate = profile?.enrollment_date
    ? new Date(profile.enrollment_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <AdminPageShell
      title="Biodata Mahasiswa"
      description="Informasi akun dan kelas terdaftar."
      variant="plain"
      icon={<User className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(backTo)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          {isSuperAdmin && profile ? (
            <Button variant="outline" asChild>
              <Link to="/users">
                <ExternalLink className="mr-2 h-4 w-4" />
                Kelola di Pengguna
              </Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Profil</h2>
          <div className="mt-4 grid h-24 w-24 place-items-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
            {isInitialLoading ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              String(profile?.name ?? '?')
                .trim()
                .slice(0, 1)
                .toUpperCase()
            )}
          </div>
          {isInitialLoading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <p className="mt-4 text-lg font-bold text-foreground">{profile?.name}</p>
              <p className="font-mono text-sm text-muted-foreground">{profile?.nim_nip || 'Tanpa NIM'}</p>
              <div className="mt-3">
                <Badge variant={profile?.is_active ? 'secondary' : 'outline'}>
                  {profile?.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
              Informasi akun
            </h2>
            {isInitialLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full max-w-md" />
                ))}
              </div>
            ) : (
              <dl className="mt-4 space-y-3">
                <InfoRow label="NIM / NIP" value={profile?.nim_nip} />
                <InfoRow
                  label="Email"
                  value={
                    profile?.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {profile.email}
                      </span>
                    ) : null
                  }
                />
                <InfoRow
                  label="Telepon"
                  value={
                    profile?.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {profile.phone}
                      </span>
                    ) : null
                  }
                />
                <InfoRow label="Program / Prodi" value={profile?.department} />
                <InfoRow label="Semester" value={profile?.semester != null ? `Semester ${profile.semester}` : null} />
                <InfoRow label="Peran" value={userRoleLabel(profile?.role ?? 'USER')} />
                <InfoRow label="Terdaftar sejak" value={enrolledDate} />
              </dl>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
              Kelas terdaftar
            </h2>
            {loadingClasses ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : enrollments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Belum terdaftar di kelas manapun.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                {enrollments.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/classes/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-muted/50"
                    >
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="text-muted-foreground">{formatClassLabel(c)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminPageShell>
  );
}
