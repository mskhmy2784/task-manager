import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const initializeGIS = () => {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.access_token) {
              localStorage.setItem('google_access_token', response.access_token);
              // Set expiry time (default 1 hour)
              const expiryTime = Date.now() + (response.expires_in * 1000);
              localStorage.setItem('google_token_expiry', expiryTime.toString());
              setIsAuthenticated(true);
              fetchUserInfo(response.access_token);
            }
          },
        });
        setTokenClient(client);
      }
    };

    // Check if script is already loaded
    if (window.google?.accounts?.oauth2) {
      initializeGIS();
    } else {
      // Load the Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGIS;
      document.body.appendChild(script);
    }

    // Check for existing token
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setIsAuthenticated(true);
      fetchUserInfo(token);
    }
    
    setIsLoading(false);
  }, []);

  // Fetch user info
  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUser({
        name: data.name,
        email: data.email,
        picture: data.picture
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  // Sign in
  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  // Sign out
  const signOut = useCallback(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      // Revoke the token
      window.google?.accounts?.oauth2?.revoke(token);
    }
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Check and refresh token if needed
  const checkToken = useCallback(() => {
    const expiry = localStorage.getItem('google_token_expiry');
    if (expiry && Date.now() >= parseInt(expiry)) {
      // Token expired, need to re-authenticate
      signOut();
      return false;
    }
    return isAuthenticated;
  }, [isAuthenticated, signOut]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    checkToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
