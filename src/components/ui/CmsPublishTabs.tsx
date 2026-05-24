import { CmsTabNav } from '@/components/ui/CmsTabNav';

type PublishTab = 'draft' | 'publish';

const PUBLISH_TABS = [
  { id: 'draft' as const, label: 'Draft' },
  { id: 'publish' as const, label: 'Publik' },
] as const;

/** Toggle status publikasi — mengganti Select Draft/Publish di CMS */
export function CmsPublishTabs({
  published,
  onChange,
}: {
  published: boolean;
  onChange: (published: boolean) => void;
}) {
  return (
    <CmsTabNav<PublishTab>
      tabs={PUBLISH_TABS}
      value={published ? 'publish' : 'draft'}
      onChange={(id) => onChange(id === 'publish')}
      ariaLabel="Status publikasi"
    />
  );
}
