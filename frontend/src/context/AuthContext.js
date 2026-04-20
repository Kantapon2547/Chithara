import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    access: localStorage.getItem("access"),
    refresh: localStorage.getItem("refresh"),
  });

  const loginUser = (tokens) => {
    localStorage.setItem("access", tokens.access);
    localStorage.setItem("refresh", tokens.refresh);

    setAuth(tokens);
  };

  const logoutUser = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    setAuth({ access: null, refresh: null });
  };

  return (
    <AuthContext.Provider value={{ auth, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);