import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const home = !user ? '/login' : user.role === 'kitchen' ? '/kitchen' : user.role === 'admin' ? '/admin' : '/';
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="text-8xl mb-4">🍽️</div>
        <h1 className="font-poppins font-bold text-4xl text-primary mb-2">404</h1>
        <h2 className="font-poppins font-semibold text-xl mb-3 text-gray-700">Page not found</h2>
        <p className="text-gray-400 text-sm mb-8">Looks like this page got eaten.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">← Go back</button>
          <Link to={home} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-indigo-700 transition-all">🏠 Home</Link>
        </div>
      </motion.div>
    </div>
  );
};
export default NotFoundPage;
