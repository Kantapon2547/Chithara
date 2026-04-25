import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import PlayerBar from "./components/PlayerBar";

import GeneratePage from "./pages/GeneratePage";
import LibraryPage from "./pages/LibraryPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AlbumPage from "./pages/AlbumPage";

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

  const auth = isAuthenticated();

  return (
    <div className="app-layout">

      {/* NAVBAR */}
      {!isAuthPage && auth && <Navbar />}

      {/* MAIN CONTENT */}
      <div className={isAuthPage ? "" : "main-content"}>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />

          {/* ROOT REDIRECT */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* PROTECTED ROUTES */}
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

          {/* 🔥 FIX: ALBUM PAGE ROUTE (THIS WAS MISSING) */}
          <Route
            path="/albums/:id"
            element={
              <PrivateRoute>
                <AlbumPage />
              </PrivateRoute>
            }
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              auth
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/login" replace />
            }
          />

        </Routes>
      </div>

      {/* PLAYER */}
      {!isAuthPage && auth && <PlayerBar />}

    </div>
  );
}