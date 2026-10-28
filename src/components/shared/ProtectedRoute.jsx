import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../services/authService";
import { dashboardPath } from "../../lib/roles";

/**
 * Wraps protected routes.
 *  - Shows a spinner while auth state and profile are loading.
 *  - Sends signed-out (or unverified) users to the login page.
 *  - Blocks accounts with no profile instead of letting them through.
 *  - Sends users with the wrong role to their own dashboard.
 *
 * This is a convenience for the UI only. Real enforcement is in
 * firestore.rules and the server API.
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Account profile not found</h1>
          <p className="text-sm text-gray-500 mb-6">
            We couldn't load your GymTrace profile. Please sign in again, or contact the gym administrator.
          </p>
          <button
            onClick={() => logoutUser()}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to={dashboardPath(userData.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
