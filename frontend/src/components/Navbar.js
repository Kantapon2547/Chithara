import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { fetchQuota } from "../api/client";
import "../styles/Navbar.css";

export default function Sidebar() {
  const [quota, setQuota] = useState({ used: 0, limit: 10, remaining: 10 });

  useEffect(() => {
    fetchQuota().then(setQuota).catch(() => {});
  }, []);

  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const fillClass = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

  return (
    <aside className="sidebar">
      
      {/* LOGO */}
      <div className="sidebar-logo">
        🎵 Chithar<span>a</span>
      </div>

      {/* NAV */}
      <nav className="sidebar-nav">
        
        <NavLink
          to="/generate"
          className={({ isActive }) =>
            "nav-item" + (isActive ? " active" : "")
          }
        >
          <span className="icon">🎵</span>
          Generate
        </NavLink>

        <NavLink
          to="/library"
          className={({ isActive }) =>
            "nav-item" + (isActive ? " active" : "")
          }
        >
          <span className="icon">📚</span>
          My Library
        </NavLink>

      </nav>

      {/* QUOTA */}
      <div className="sidebar-quota">
        <div className="quota-label">Weekly Quota</div>

        <div className="quota-bar">
          <div
            className={`quota-fill ${fillClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="quota-count">
          {quota.remaining} remaining{" "}
          <span className="used">
            ({quota.used}/{quota.limit})
          </span>
        </div>
      </div>

    </aside>
  );
}