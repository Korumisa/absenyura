import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

/** Overlay blokir ringan saat pengguna menunggu izin / kirim data */
export default function ActionLoadingOverlay({
  show,
  label,
}: {
  show: boolean;
  label: string;
}) {
  return <PublicLoadingOverlay show={show} label={label} className="z-[100]" />;
}
