import { useState } from "react";
import { login } from "../api/client";
import { useNavigate, Link } from "react-router-dom";
import { Music2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // =========================
  // NORMAL LOGIN
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const data = await login(username, password);

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Invalid username or password"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE LOGIN
  // =========================
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await fetch("http://localhost:8000/api/google-login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Google login failed");
      }

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // force refresh so navbar updates immediately
      window.location.href = "/dashboard";

    } catch (err) {
      setError("Google login failed");
    }
  };

  return (
    <div className="gradient-hero">
      <div className="login-wrapper">
        <div className="glass-card">

          {/* LOGO */}
          <div className="logo">
            <div className="logo-box">
              <Music2 size={18} color="white" />
            </div>
            <div className="logo-text">
              Chithara <span>AI</span>
            </div>
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">
            Sign in to continue creating music
          </p>

          {/* ================= FORM ================= */}
          <form onSubmit={handleLogin} className="login-form">

            {/* USERNAME */}
            <div className="input-group">
              <label>Username</label>
              <div className="input-box">
                <Mail size={14} />
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <Lock size={14} />

                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && <p className="error">{error}</p>}

            {/* BUTTON */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>

          {/* ================= DIVIDER ================= */}
          <div style={{ textAlign: "center", margin: "16px 0", opacity: 0.6 }}>
            OR
          </div>

          {/* ================= GOOGLE BUTTON ================= */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError("Google login failed")}
            />
          </div>

          {/* FOOTER */}
          <p className="login-footer">
            Don't have an account?{" "}
            <Link to="/register">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
}