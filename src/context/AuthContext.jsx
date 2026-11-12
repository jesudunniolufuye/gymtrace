import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthChange } from "../services/authService";
import { getUserDoc } from "../services/userService";
import { retry } from "../lib/retry";

const AuthContext = createContext(null);

// Hook lives next to the provider on purpose; it is not a component.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Firebase Auth user (verified only)
  const [userData, setUserData] = useState(null); // Firestore profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      // Users who have not verified their email are treated as signed out.
      // The login page signs them out and explains why; the Firestore rules
      // also refuse their requests.
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      // Keep the app in its loading state until the profile is known, so
      // route guards never see "signed in, profile missing" mid-fetch.
      setLoading(true);
      let profile = null;
      try {
        // One failed read must not strand the person on "profile not found".
        profile = await retry(() => getUserDoc(firebaseUser.uid));
      } catch (error) {
        console.error("Failed to load user profile", error);
      }
      setUser(firebaseUser);
      setUserData(profile);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /** Call after profile updates to refresh context */
  const refreshUserData = async () => {
    if (user) {
      const profile = await getUserDoc(user.uid);
      setUserData(profile);
    }
  };

  const value = { user, userData, loading, refreshUserData };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
