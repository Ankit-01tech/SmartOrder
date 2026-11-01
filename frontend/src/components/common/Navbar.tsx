import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';

const studentLinks = [
  { path: '/',        label: 'Home',   icon: '🏠' },
  { path: '/menu',    label: 'Menu',   icon: '🍽️' },
  { path: '/queue',   label: 'Queue',  icon: '📊' },
  { path: '/history', label: 'Orders', icon: '📋' },
];
const kitchenLinks = [{ path: '/kitchen', label: 'Kitchen', icon: '👨‍🍳' }];
const adminLinks   = [
  { path: '/admin',   label: 'Analytics', icon: '📊' },
  { path: '/kitchen', label: 'Kitchen',   icon: '👨‍🍳' },
];

const FALLBACK_IMG = '';

const Navbar: React.FC = () => {
  const { user, logout }  = useAuth();
  const { itemCount }     = useCart();
  const location          = useLocation();
  const navigate          = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [kitchenOnline, setKitchenOnline] = useState(true);
  const [pendingCount, setPendingCount]   = useState(0);

  useEffect(() => {
    if (!user) return;
    // Fetch kitchen status for all roles
    api.get('/kitchen/status').then(res => setKitchenOnline(res.data.isOnline !== false)).catch(() => {});
    // Fetch pending kitchen requests count for admin
    if (user.role === 'admin') {
      api.get('/admin/kitchen-requests').then(res => setPendingCount(res.data.requests?.length || 0)).catch(() => {});
    }

    const socket = getSocket();
    socket.on('kitchenStatusChange', ({ isOnline }: any) => setKitchenOnline(isOnline));
    socket.on('kitchenRegistrationRequest', () => {
      if (user.role === 'admin') setPendingCount(p => p + 1);
    });

    return () => {
      socket.off('kitchenStatusChange');
      socket.off('kitchenRegistrationRequest');
    };
  }, [user]);

  if (!user) return null;

  const links = user.role === 'admin' ? adminLinks : user.role === 'kitchen' ? kitchenLinks : studentLinks;
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { setMenuOpen(false); logout(); navigate('/login'); };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-indigo-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to={user.role === 'kitchen' ? '/kitchen' : user.role === 'admin' ? '/admin' : '/'}
          className="flex items-center gap-2 font-poppins font-bold text-primary text-lg">
          🍽️ SmartOrder
          {/* Kitchen status dot */}
          <span className={`inline-block w-2 h-2 rounded-full ${kitchenOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={kitchenOnline ? 'Kitchen Online' : 'Kitchen Offline'} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-1">
          {links.map(l => (
            <Link key={l.path} to={l.path}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all relative ${
                location.pathname === l.path ? 'bg-indigo-100 text-primary' : 'text-gray-400 hover:bg-indigo-50 hover:text-primary'
              }`}>
              {l.icon} {l.label}
              {l.path === '/admin' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Cart button — student only */}
          {user.role === 'student' && (
            <Link to="/cart"
              className="relative bg-primary text-white text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition-all">
              🛒 Cart
              {itemCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </motion.span>
              )}
            </Link>
          )}

          {/* Avatar + dropdown */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-200 cursor-pointer select-none flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
                  {initials}
                </div>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-10 bg-white rounded-2xl shadow-card border border-gray-100 p-2 min-w-[190px] z-50"
                  onClick={() => setMenuOpen(false)}>
                  <div className="px-3 py-2 mb-1">
                    <div className="font-semibold text-sm truncate">{user.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                  </div>
                  <hr className="border-gray-100 mb-1" />
                  {user.role === 'student' && (
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
                      👤 My Profile
                    </Link>
                  )}
                  {user.role === 'student' && (
                    <Link to="/history" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
                      📋 Order History
                    </Link>
                  )}
                  <hr className="border-gray-100 my-1" />
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    🚪 Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-1 text-gray-500 text-lg" onClick={() => setMenuOpen(v => !v)}>☰</button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-indigo-50 bg-white">
            {links.map(l => (
              <Link key={l.path} to={l.path} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b border-gray-50 ${location.pathname === l.path ? 'text-primary bg-indigo-50' : 'text-gray-600'}`}>
                {l.icon} {l.label}
              </Link>
            ))}
            {user.role === 'student' && (
              <Link to="/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b border-gray-50 text-gray-600">
                👤 Profile
              </Link>
            )}
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-500">🚪 Sign Out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
