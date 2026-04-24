// src/components/ShareModal.js
import React, { useState } from "react";
import { useToast } from "../context/ToastContext";
import { createShareLink, updatePrivacy } from "../api/client";
import "../styles/ShareModal.css";

export default function ShareModal({ song, onClose }) {
  const { addToast } = useToast();

  const [emails, setEmails] = useState("");
  const [privacy, setPrivacy] = useState(song.privacy_status || "private");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────────────
  // 🔒 Update privacy (REAL API)
  // ─────────────────────────────────────────────
  const handlePrivacyChange = async (value) => {
    try {
      setPrivacy(value);
      await updatePrivacy(song.id, value);
      addToast("Privacy updated", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // ─────────────────────────────────────────────
  // 📧 Generate link + send invites (REAL API)
  // ─────────────────────────────────────────────
  const handleShare = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const emailList = emails
        .split(",")
        .map(e => e.trim())
        .filter(Boolean);

      const res = await createShareLink(song.id, emailList);

      setShareUrl(res.url);
      addToast("Share link created & emails sent!", "success");
      setEmails("");

    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 📋 Copy link
  // ─────────────────────────────────────────────
  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    addToast("Copied!", "success");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h3>🔗 Share "{song.title}"</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 🔒 Privacy */}
        <div className="form-group">
          <label className="form-label">Privacy</label>

          <select
            className="form-control"
            value={privacy}
            onChange={(e) => handlePrivacyChange(e.target.value)}
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌐 Public</option>
            <option value="shared">👥 Shared</option>
          </select>
        </div>

        {/* 🔗 Share link */}
        <div className="form-group">
          <label className="form-label">Share Link</label>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-control"
              value={shareUrl || "Click generate to create link"}
              readOnly
              style={{ flex: 1 }}
            />

            <button
              className="btn btn-primary btn-sm"
              onClick={copyLink}
              disabled={!shareUrl}
            >
              Copy
            </button>
          </div>
        </div>

        {/* 📧 Email invite */}
        <div className="form-group">
          <label className="form-label">Invite by Email</label>

          <form onSubmit={handleShare} style={{ display: "flex", gap: 8 }}>
            <input
              className="form-control"
              placeholder="a@gmail.com, b@gmail.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              style={{ flex: 1 }}
            />

            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>

        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}