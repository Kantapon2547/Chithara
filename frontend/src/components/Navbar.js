import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchQuota, logout } from "../api/client";
import "../styles/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const [quota, setQuota] = useState({
    used: 0,
    limit: 10,
    remaining: 10,
  });

  useEffect(() => {
    const loadQuota = async () => {
      try {
        const data = await fetchQuota();
        setQuota(data);
      } catch (err) {
        console.error("Failed to load quota:", err);
      }
    };

    loadQuota();
  }, []);

  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const fillClass = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">

      {/* LEFT */}
      <div className="navbar-logo">
        🎵 Chithara
      </div>

      {/* CENTER NAV */}
      <nav className="navbar-nav">

        <NavLink to="/" className="nav-item">
          Dashboard
        </NavLink>

        <NavLink to="/generate" className="nav-item">
          Generate
        </NavLink>

        <NavLink to="/library" className="nav-item">
          Library
        </NavLink>

      </nav>

      {/* RIGHT SIDE */}
      <div className="navbar-right">

        {/* QUOTA */}
        <div className="navbar-quota">
          <div className="quota-bar">
            <div
              className={`quota-fill ${fillClass}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="quota-text">
            {quota.remaining}/{quota.limit}
          </div>
        </div>

        {/* LOGOUT */}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>

      </div>

    </header>
  );
}