import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, {email: string; password: string}> = {
      student: { email: 'student@demo.com', password: 'demo1234' },
      kitchen: { email: 'kitchen@demo.com', password: 'demo1234' },
      admin:   { email: 'admin@demo.com',   password: 'demo1234' },
    };
    setForm(creds[role]);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #E8EEFF 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-card border border-indigo-100 p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="font-poppins text-2xl font-bold text-primary">SmartOrder</h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Smart Queue System</p>
        </div>

        {/* Demo role buttons */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 text-center mb-2">Quick demo login:</p>
          <div className="flex gap-2">
            {['student', 'kitchen', 'admin'].map(r => (
              <button key={r} onClick={() => fillDemo(r)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold border border-indigo-200 text-primary hover:bg-indigo-50 transition-all capitalize">
                {r === 'student' ? '👨‍🎓' : r === 'kitchen' ? '👨‍🍳' : '📊'} {r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" placeholder="you@college.edu" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-indigo-100 transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-indigo-100 transition-all" required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-sm">
            {loading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Register</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
