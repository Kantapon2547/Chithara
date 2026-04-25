import { useState } from "react";
import { login, googleAuth } from "../api/client";
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

  // -------------------------
  // NORMAL LOGIN
  // -------------------------
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
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // GOOGLE LOGIN (FIXED)
  // -------------------------
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const data = await googleAuth(credentialResponse.credential);

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError("Google login failed");
    }
  };

  return (
    <div className="gradient-hero">
      <div className="login-wrapper">
        <div className="glass-card">

          <div className="logo">
            <div className="logo-box">
              <Music2 size={18} color="white" />
            </div>
            <div className="logo-text">
              Chithara <span>AI</span>
            </div>
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to continue creating music</p>

          <form onSubmit={handleLogin} className="login-form">

            <div className="input-group">
              <label>Username</label>
              <div className="input-box">
                <Mail size={14} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  placeholder="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <Lock size={14} />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <button className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ textAlign: "center", margin: "16px 0", opacity: 0.6 }}>
            OR
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError("Google login failed")}
            />
          </div>

          <p className="login-footer">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
}