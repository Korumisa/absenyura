import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PublicSiteHome() {
  const links = [
    { label: 'Profil', to: '/public-site/profile' },
    { label: 'Struktur', to: '/public-site/structure' },
    { label: 'Program Kerja', to: '/public-site/programs' },
    { label: 'Berita & Info', to: '/public-site/posts' },
    { label: 'Galeri', to: '/public-site/galleries' },
    { label: 'Open Recruitment', to: '/public-site/recruitments' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Konten Website</h1>
        <p className="text-slate-500 dark:text-zinc-400">Kelola profil, struktur, berita, galeri, dan open recruitment.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-4">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Akses Cepat</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((x) => (
            <Button key={x.to} asChild variant="outline" className="justify-start">
              <Link to={x.to}>{x.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

