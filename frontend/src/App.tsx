import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import NotFoundPage      from './pages/NotFoundPage';
import StudentHome       from './pages/student/StudentHome';
import MenuPage          from './pages/student/MenuPage';
import QueuePage         from './pages/student/QueuePage';
import CartPage          from './pages/student/CartPage';
import PaymentPage       from './pages/student/PaymentPage';
import TrackPage         from './pages/student/TrackPage';
import OrderHistoryPage  from './pages/student/OrderHistoryPage';
import ProfilePage       from './pages/student/ProfilePage';
import KitchenDashboard  from './pages/kitchen/KitchenDashboard';
import AdminDashboard    from './pages/admin/AdminDashboard';
import Navbar            from './components/common/Navbar';

const PrivateRoute = ({ children, roles }: { children: JSX.Element; roles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'kitchen' ? '/kitchen' : user.role === 'admin' ? '/admin' : '/';
    return <Navigate to={fallback} replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student */}
        <Route path="/"          element={<PrivateRoute roles={['student']}><StudentHome /></PrivateRoute>} />
        <Route path="/menu"      element={<PrivateRoute roles={['student']}><MenuPage /></PrivateRoute>} />
        <Route path="/queue"     element={<PrivateRoute roles={['student']}><QueuePage /></PrivateRoute>} />
        <Route path="/cart"      element={<PrivateRoute roles={['student']}><CartPage /></PrivateRoute>} />
        <Route path="/payment"   element={<PrivateRoute roles={['student']}><PaymentPage /></PrivateRoute>} />
        <Route path="/track"     element={<PrivateRoute roles={['student']}><TrackPage /></PrivateRoute>} />
        <Route path="/track/:orderId" element={<PrivateRoute roles={['student']}><TrackPage /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute roles={['student']}><OrderHistoryPage /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute roles={['student']}><ProfilePage /></PrivateRoute>} />

        {/* Kitchen */}
        <Route path="/kitchen"   element={<PrivateRoute roles={['kitchen','admin']}><KitchenDashboard /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"     element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={user ? <NotFoundPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { fontFamily: 'Inter, sans-serif', borderRadius: '12px', fontSize: '14px' },
              duration: 3500,
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
