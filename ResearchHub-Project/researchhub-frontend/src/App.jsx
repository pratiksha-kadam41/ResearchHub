import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import CompleteProfile from "./pages/CompleteProfile";
import CompleteFacultyProfile from "./pages/CompleteFacultyProfile";
import FindMentor from "./pages/FindMentor";

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { DashboardStudent } from './pages/DashboardStudent';
import { DashboardFaculty } from './pages/DashboardFaculty';
import CreateRepository from "./pages/CreateRepository";
import RepositoryWorkspace from "./pages/RepositoryWorkspace";
import AcceptRepositoryInvitation from "./pages/AcceptRepositoryInvitation";
import Tasks from "./pages/Task";
import { ResetPassword } from "./pages/ResetPassword";
import SharedLibrary from "./pages/SharedLibrary";
import VerifyEmail from "./pages/VerifyEmail";


// Redirect already-logged-in users away from public pages
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    const returnTo = location.state?.returnTo;
    if (
      typeof returnTo === "string" &&
      /^\/invitations\/(?:accept\/[a-f\d]{64}|respond\/[a-f\d]{64}\/(?:accept|reject))$/i.test(returnTo)
    ) {
      return <Navigate to={returnTo} replace />;
    }

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
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invitations/accept/:token" element={<AcceptRepositoryInvitation />} />
          <Route path="/invitations/respond/:token/:decision" element={<AcceptRepositoryInvitation />} />

          {/* Open the login screen when a visitor first opens the website */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected Routes — student */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/dashboard/student" element={<DashboardStudent />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/shared-library" element={<SharedLibrary />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/repository/create" element={<CreateRepository />} />
            <Route path="/find-mentor" element={<FindMentor />} />
          </Route>

          {/* A repository workspace is available to its student members and accepted faculty mentors. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/repository/:repositoryId" element={<RepositoryWorkspace />} />
          </Route>

          {/* Protected Routes — faculty */}
          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route path="/dashboard/faculty" element={<DashboardFaculty />} />
            <Route path="/complete-faculty-profile" element={<CompleteFacultyProfile />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
