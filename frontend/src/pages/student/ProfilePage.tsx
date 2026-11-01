import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const FALLBACK_AVATAR = '';

const ProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'profile' | 'security'>('profile');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nameEdit, setNameEdit] = useState(user?.name || '');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be < 2 MB'); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.patch('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar: res.data.user.avatar });
      toast.success('Profile picture updated! 🖼️');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameEdit.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', { name: nameEdit });
      updateUser({ name: res.data.user.name });
      toast.success('Name updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-bg p-4 max-w-2xl mx-auto page-enter">
      {/* Avatar card */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6 mb-5 flex items-center gap-5">

        {/* Avatar with upload */}
        <div className="relative flex-shrink-0 cursor-pointer group" onClick={() => avatarRef.current?.click()}>
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-200">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
                {initials}
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
            {uploadingAvatar
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="text-white text-xs font-bold">📷</span>}
          </div>
          <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = ''; }} />
        </div>

        <div className="flex-1">
          <h2 className="font-poppins font-bold text-xl">{user.name}</h2>
          <p className="text-sm text-gray-400">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
              user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
              user.role === 'kitchen' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>{user.role}</span>
            {user.studentId && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">ID: {user.studentId}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Click photo to update profile picture</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['profile', 'security'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-white text-primary shadow' : 'text-gray-400'}`}>
            {t === 'profile' ? '👤 Profile' : '🔒 Security'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
            <h3 className="font-semibold text-sm mb-4 text-gray-700">Account Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <div className="flex gap-2">
                  <input value={nameEdit} onChange={e => setNameEdit(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all" />
                  <button onClick={handleSaveName} disabled={saving || nameEdit === user.name}
                    className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
              {[
                { label: 'Email', value: user.email },
                { label: 'Role', value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
                { label: 'Student ID', value: user.studentId || 'Not set' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-400">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 font-semibold py-3 rounded-2xl border border-red-100 hover:bg-red-100 transition-all text-sm">
            🚪 Sign Out
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
          <h3 className="font-semibold text-sm mb-4 text-gray-700">Change Password</h3>
          <div className="space-y-4">
            {[
              { key: 'current', label: 'Current Password', placeholder: '••••••••' },
              { key: 'next',    label: 'New Password',     placeholder: 'Min 6 characters' },
              { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium mb-1.5 text-gray-600">{f.label}</label>
                <input type="password" placeholder={f.placeholder} value={(pwForm as any)[f.key]}
                  onChange={e => setPwForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-all" />
              </div>
            ))}
            <button
              onClick={async () => {
                if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
                if (pwForm.next.length < 6) { toast.error("Min 6 characters"); return; }
                toast.success('Password change — wire to PATCH /api/auth/change-password in production');
                setPwForm({ current: '', next: '', confirm: '' });
              }}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all text-sm">
              🔒 Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
