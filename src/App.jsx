import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Privacy from './pages/Privacy';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Terms from './pages/Terms';
import Dashboard from './pages/Dashboard';
import BookingPage from './pages/BookingPage';
import PublicBusinessPage from './components/PublicBusinessPage';
import AdminSignIn from './pages/AdminSignIn';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './routes/ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/book/:slug" element={<PublicBusinessPage />} />
        <Route path="/:businessSlug/book" element={<BookingPage />} />
        <Route path="/book/:businessSlug/appointments" element={<BookingPage />} />
        <Route path="/gsadmin/" element={<AdminSignIn />} />
        <Route path="/gsadmin/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;