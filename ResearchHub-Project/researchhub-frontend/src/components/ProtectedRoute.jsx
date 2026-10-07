import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If they have a user but wrong role, redirect them to their respective dashboard
    const dashboardPath = user.role === 'student' ? '/dashboard/student' : '/dashboard/faculty';
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
};
