import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import PlayerBar from "./components/PlayerBar";

import GeneratePage from "./pages/GeneratePage";
import LibraryPage from "./pages/LibraryPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import "./App.css";

/* =========================
   AUTH CHECK
========================= */
const isAuthenticated = () => {
  return !!localStorage.getItem("access");
};

/* =========================
   PRIVATE ROUTE
========================= */
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

/* =========================
   APP
========================= */
export default function App() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div className="app-layout">

      {/* NAVBAR (hide on login) */}
      {!isAuthPage && isAuthenticated() && <Navbar />}

      {/* MAIN CONTENT */}
      <div className={isAuthPage ? "" : "main-content"}>
        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<LoginPage />} />

          {/* REDIRECT ROOT */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* PROTECTED */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/generate"
            element={
              <PrivateRoute>
                <GeneratePage />
              </PrivateRoute>
            }
          />

          <Route
            path="/library"
            element={
              <PrivateRoute>
                <LibraryPage />
              </PrivateRoute>
            }
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              isAuthenticated()
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/login" replace />
            }
          />

        </Routes>
      </div>

      {/* PLAYER (hide on login) */}
      {!isAuthPage && isAuthenticated() && <PlayerBar />}

    </div>
  );
}