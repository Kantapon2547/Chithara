import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import PlayerBar from "./components/PlayerBar";

import GeneratePage from "./pages/GeneratePage";
import LibraryPage from "./pages/LibraryPage";
import LoginPage from "./pages/LoginPage";

import "./styles/Layout.css";
import "./App.css";

/* =========================
   AUTH CHECK
========================= */
function isAuthenticated() {
  return !!localStorage.getItem("access");
}

/* =========================
   PROTECTED ROUTE
========================= */
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

/* =========================
   APP
========================= */
function App() {
  return (
    <div className="app-layout">

      {/* 🔝 NAVBAR */}
      {isAuthenticated() && <Navbar />}

      {/* 📄 MAIN CONTENT */}
      <div className="main-content">
        <Routes>

          {/* 🔓 PUBLIC */}
          <Route path="/login" element={<LoginPage />} />

          {/* 🔒 PROTECTED */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <GeneratePage />
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

          {/* 🔁 FALLBACK */}
          <Route
            path="*"
            element={
              isAuthenticated()
                ? <Navigate to="/generate" />
                : <Navigate to="/login" />
            }
          />

        </Routes>
      </div>

      {/* 🎧 PLAYER BAR */}
      {isAuthenticated() && <PlayerBar />}

    </div>
  );
}

export default App;