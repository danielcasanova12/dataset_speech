import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import HomePage from './pages/HomePage';
import RecordingPage from './pages/RecordingPage';
import MusicSessionPage from './pages/MusicSessionPage';
import AdminRecordingsPage from './pages/AdminRecordingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuestRegisterPage from './pages/GuestRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { api } from './services/api';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Tenta conectar com a API logo que o site abre (Heartbeat)
    api.heartbeat();
  }, []);

  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/guest-register" element={<GuestRegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/recording/:datasetId" element={<RecordingPage key={location.pathname} />} />
              <Route path="/music-session" element={<MusicSessionPage key={location.pathname} />} />
              <Route path="/admin/recordings" element={<AdminRecordingsPage />} />
            </Route>
          </Routes>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  )
}

export default AppWrapper;
