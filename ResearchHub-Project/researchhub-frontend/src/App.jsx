import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import CompleteProfile from "./pages/CompleteProfile";

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { DashboardStudent } from './pages/DashboardStudent';
import { DashboardFaculty } from './pages/DashboardFaculty';
import CreateRepository from "./pages/CreateRepository";
import RepositoryWorkspace from "./pages/RepositoryWorkspace";
import AcceptRepositoryInvitation from "./pages/AcceptRepositoryInvitation";
import InviteRepositoryMembers from "./pages/InviteRepositoryMembers";

// Redirect already-logged-in users away from public pages
const PublicRoute = ({ children }) => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    return <Navigate to={user.role === 'faculty' ? '/dashboard/faculty' : '/dashboard/student'} replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes — redirect to dashboard if already logged in */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/invitations/accept/:token"
            element={<AcceptRepositoryInvitation />}
          />

          {/* Open the login screen when a visitor first opens the website */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected Routes — require login */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/dashboard/student" element={<DashboardStudent />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/repository/create" element={<CreateRepository />} />
            <Route path="/repository/group-invite" element={<InviteRepositoryMembers />} />
            <Route path="/repository/:repositoryId" element={<RepositoryWorkspace />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route path="/dashboard/faculty" element={<DashboardFaculty />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
