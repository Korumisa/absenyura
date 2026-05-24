import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** [IA] C-02 — buka situs publik dari panel CMS */
export function CmsViewSiteLink({ href, label = 'Lihat situs publik' }: { href: string; label?: string }) {
  return (
    <Button asChild variant="outline" className="min-h-11 gap-2">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </Button>
  );
}
