import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  // Remove credentials saved by previous versions that persisted them across browser sessions.
  const [user, setUser] = useState(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    const savedUser = sessionStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Keep credentials only for the current browser tab session.
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem("token") || null;
  });


  // =====================================================
  // LOGIN
  // =====================================================

  const login = (userData, authToken = null) => {

    setUser(userData);

    // Save user information for the current tab session.
    sessionStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    // Save the JWT token for the current tab session.
    if (authToken) {
      setToken(authToken);
      sessionStorage.setItem("token", authToken);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    setUser(null);
    setToken(null);

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// =====================================================
// useAuth HOOK
// =====================================================

export const useAuth = () => {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};
