import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import api from '@/services/api';
import { toast } from 'sonner';
import { User, Lock, Monitor, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { user, setAuth, accessToken } = useAuthStore();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/settings/profile', {
        name: formData.name,
        phone: formData.phone,
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      
      // Update local state
      if (accessToken) {
        setAuth({ ...user!, name: formData.name }, accessToken);
      }
      
      toast.success(res.data.message || 'Profil berhasil diperbarui');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pengaturan</h1>
        <p className="text-slate-500 dark:text-zinc-400">Kelola profil, kata sandi, dan preferensi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-2">
            <Button variant="ghost" className="w-full justify-start text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
              <User className="w-5 h-5 mr-3" /> Profil & Keamanan
            </Button>
          </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Form */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Informasi Profil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input 
                  type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input 
                  type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" disabled value={user?.email || ''}
                />
                <p className="text-xs text-slate-500 mt-1">Email tidak dapat diubah. Hubungi Super Admin jika perlu bantuan.</p>
              </div>
              
              <hr className="my-6 border-slate-200 dark:border-zinc-700" />
              
              <h3 className="text-md font-bold text-slate-800 dark:text-white mb-2">Ubah Kata Sandi</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Kosongkan jika tidak ingin mengubah kata sandi.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kata Sandi Saat Ini</Label>
                  <Input 
                    type="password" value={formData.current_password} onChange={e => setFormData({...formData, current_password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kata Sandi Baru</Label>
                    <Input 
                      type="password" value={formData.new_password} onChange={e => setFormData({...formData, new_password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Kata Sandi</Label>
                    <Input 
                      type="password" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">Manajemen Perangkat</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Logout paksa dari perangkat ini (akan menghapus sesi token).</p>
            <button 
              onClick={() => {
                localStorage.removeItem('device_fingerprint');
                toast.success('Perangkat dilupakan. Anda akan diminta login kembali pada percobaan berikutnya.');
              }}
              className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <LogOut size={16} /> Lupakan Perangkat Ini
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}