import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'student', studentId: '' });
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const { register }          = useAuth();
  const navigate              = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register(form.name, form.email, form.password, form.role, form.studentId || undefined);
      if (result?.pending) {
        setPending(true);
        toast.success('Application submitted! Awaiting admin approval.');
        return;
      }
      toast.success('Account created! Welcome 🎉');
      navigate(form.role === 'kitchen' ? '/kitchen' : '/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  if (pending) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #E8EEFF 100%)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-card border border-indigo-100 p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="font-poppins font-bold text-xl mb-2 text-primary">Application Submitted!</h2>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            Your kitchen staff application is pending admin approval.<br />
            You'll be able to log in once an admin approves your account.
          </p>
          <Link to="/login" className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm inline-block hover:bg-indigo-700 transition-all">
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #E8EEFF 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-card border border-indigo-100 p-8">

        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="font-poppins text-2xl font-bold text-primary">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Join SmartOrder today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'name',     label: 'Full Name', type: 'text',     placeholder: 'Arjun Sharma' },
            { key: 'email',    label: 'Email',     type: 'email',    placeholder: 'you@college.edu' },
            { key: 'password', label: 'Password',  type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-indigo-100 transition-all" required />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-all">
              <option value="student">👨‍🎓 Student</option>
              <option value="kitchen">👨‍🍳 Kitchen Staff (requires admin approval)</option>
            </select>
            {form.role === 'kitchen' && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ Kitchen staff accounts require admin approval before login access is granted.
              </p>
            )}
          </div>

          {form.role === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Student ID <span className="text-gray-400">(optional)</span></label>
              <input type="text" placeholder="e.g. CS2024001" value={form.studentId}
                onChange={e => set('studentId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-all" />
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-sm">
            {loading ? '⏳ Creating account...' : '🚀 Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
