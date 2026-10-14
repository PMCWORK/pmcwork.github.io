import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  firebaseReady
} from '../services/firebase';
import {
  isAuthorizedEmail,
  loginWithGoogle as svcLoginWithGoogle,
  loginWithPin as svcLoginWithPin,
  logoutUser as svcLogoutUser,
  logAudit,
  maskEmail
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase().trim();
        const authorized = await isAuthorizedEmail(email);
        if (authorized) {
          setUser(currentUser);
          setUnauthorizedEmail(null);
          setAuthError(null);
          logAudit('auth', 'login', { user: currentUser.displayName || 'Authorized User' }, undefined, undefined, currentUser);
        } else {
          setUser(null);
          setUnauthorizedEmail(maskEmail(email));
          setAuthError('Unauthorized Google account. Access restricted to PM Computers management.');
          logAudit('auth', 'denied', { email: maskEmail(email), reason: 'Unauthorized Email' });
        }
      } else {
        setUser(null);
        setUnauthorizedEmail(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const resUser = await svcLoginWithGoogle();
      const email = (resUser.email || '').toLowerCase().trim();
      const authorized = await isAuthorizedEmail(email);
      if (!authorized) {
        setUser(null);
        setUnauthorizedEmail(maskEmail(email));
        setAuthError('Account not recognized in PMC authorized emails list.');
        logAudit('auth', 'denied', { email: maskEmail(email) });
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      setAuthError(err.message || 'Google Sign-In failed or cancelled.');
    } finally {
      setLoading(false);
    }
  };

  const loginPin = async (pin) => {
    try {
      setLoading(true);
      setAuthError(null);
      const resUser = await svcLoginPin(pin);
      setUser(resUser);
      setUnauthorizedEmail(null);
      logAudit('auth', 'login', { method: 'Guest PIN Access' }, undefined, undefined, resUser);
    } catch (err) {
      setAuthError(err.message || 'Incorrect PIN.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await svcLogoutUser();
      setUser(null);
      setUnauthorizedEmail(null);
      setAuthError(null);
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        unauthorizedEmail,
        loginGoogle,
        loginPin,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
