import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  QrCode,
  BarChart3,
  ShieldAlert,
  History,
  BookOpen,
  FileText,
  Building2,
  User,
  Layers,
  Newspaper,
  Image,
  ClipboardList,
  ClipboardCheck,
  Settings,
  Megaphone,
  Globe,
} from 'lucide-react';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'CONTENT_ADMIN';

export type AdminNavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  roles: AdminRole[];
  /** Cocokkan path persis (tanpa prefix), mis. /excuses vs /excuses/me */
  exact?: boolean;
};

export type AdminNavSection = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

const STAFF: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];
const ACADEMIC: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'USER'];
const CONTENT: AdminRole[] = ['SUPER_ADMIN', 'CONTENT_ADMIN'];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'main',
    label: 'Ringkasan',
    items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ACADEMIC }],
  },
  {
    id: 'attendance',
    label: 'Kehadiran',
    items: [
      { name: 'Pemindai QR', path: '/attend', icon: QrCode, roles: ['USER'] },
      { name: 'Sesi Absensi', path: '/sessions', icon: Calendar, roles: ACADEMIC },
      { name: 'Kelas Kuliah', path: '/classes', icon: BookOpen, roles: ACADEMIC },
      { name: 'Pengajuan Izin', path: '/excuses', icon: FileText, roles: ACADEMIC, exact: true },
      { name: 'Izin Saya', path: '/excuses/me', icon: ClipboardCheck, roles: ['USER'] },
      { name: 'Riwayat Saya', path: '/history', icon: History, roles: ['USER'] },
      { name: 'Rekap Kehadiran', path: '/reports', icon: BarChart3, roles: ACADEMIC },
      { name: 'Lokasi', path: '/locations', icon: MapPin, roles: STAFF },
    ],
  },
  {
    id: 'content',
    label: 'Konten Website',
    items: [
      { name: 'Ringkasan Konten', path: '/public-site', icon: Globe, roles: CONTENT, exact: true },
      { name: 'Profil', path: '/public-site/profile', icon: User, roles: CONTENT },
      { name: 'Struktur', path: '/public-site/structure', icon: Layers, roles: CONTENT },
      { name: 'Program Kerja', path: '/public-site/programs', icon: ClipboardList, roles: CONTENT },
      { name: 'Berita & Info', path: '/public-site/posts', icon: Newspaper, roles: CONTENT },
      { name: 'Galeri', path: '/public-site/galleries', icon: Image, roles: CONTENT },
      {
        name: 'Open Recruitment',
        path: '/public-site/recruitments',
        icon: Megaphone,
        roles: CONTENT,
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administrasi',
    items: [
      { name: 'Pengguna', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
      { name: 'Fakultas & Prodi', path: '/master-data', icon: Building2, roles: ['SUPER_ADMIN'] },
      { name: 'Audit Log', path: '/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
    ],
  },
];

export const ADMIN_NAV_FOOTER: AdminNavItem = {
  name: 'Pengaturan Akun',
  path: '/settings',
  icon: Settings,
  roles: ['SUPER_ADMIN', 'ADMIN', 'USER', 'CONTENT_ADMIN'],
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin / Dosen',
  USER: 'Mahasiswa',
  CONTENT_ADMIN: 'Admin Konten',
};

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function getNavSectionsForRole(role: string | undefined): AdminNavSection[] {
  if (!role) return [];
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role as AdminRole)),
  })).filter((section) => section.items.length > 0);
}

/** Cari section + item aktif untuk judul header/breadcrumb. */
export function findActiveNav(
  pathname: string
): { section: AdminNavSection; item: AdminNavItem } | null {
  for (const section of ADMIN_NAV_SECTIONS) {
    const item = section.items.find((it) => isNavItemActive(it, pathname));
    if (item) return { section, item };
  }
  if (isNavItemActive(ADMIN_NAV_FOOTER, pathname)) {
    return {
      section: { id: 'account', label: 'Akun', items: [ADMIN_NAV_FOOTER] },
      item: ADMIN_NAV_FOOTER,
    };
  }
  return null;
}
