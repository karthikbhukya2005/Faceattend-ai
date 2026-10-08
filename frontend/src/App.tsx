import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FaceAttendance } from './pages/FaceAttendance';
import { Users } from './pages/Users';
import { UserDetails } from './pages/UserDetails';
import { Attendance } from './pages/Attendance';
import { Analytics } from './pages/Analytics';
import { AIAssistant } from './pages/AIAssistant';
import { Settings } from './pages/Settings';
import { authService } from './services/auth';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.8),rgba(2,6,23,1))]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/face-attendance"
          element={
            <ProtectedLayout>
              <FaceAttendance />
            </ProtectedLayout>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedLayout>
              <Users />
            </ProtectedLayout>
          }
        />

        <Route
          path="/users/:id"
          element={
            <ProtectedLayout>
              <UserDetails />
            </ProtectedLayout>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedLayout>
              <UserDetails />
            </ProtectedLayout>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedLayout>
              <Attendance />
            </ProtectedLayout>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedLayout>
              <Analytics />
            </ProtectedLayout>
          }
        />

        <Route
          path="/ai-assistant"
          element={
            <ProtectedLayout>
              <AIAssistant />
            </ProtectedLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
