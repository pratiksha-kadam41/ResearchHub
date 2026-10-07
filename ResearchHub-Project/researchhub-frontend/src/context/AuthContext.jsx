import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  // Get previously logged-in user from localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Get JWT token from localStorage
  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });


  // =====================================================
  // LOGIN
  // =====================================================

  const login = (userData, authToken = null) => {

    setUser(userData);

    // Save user information
    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    // Save JWT token
    if (authToken) {
      setToken(authToken);
      localStorage.setItem("token", authToken);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
