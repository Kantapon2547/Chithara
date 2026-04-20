// src/components/ShareModal.js – FR-16, FR-17, FR-18
import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function ShareModal({ song, onClose }) {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");

  const shareUrl = `${window.location.origin}/shared/${song.id}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast("Share link copied to clipboard!", "success");
    });
  }

  function sendInvite(e) {
    e.preventDefault();
    if (!email) return;
    // In a real app this would call an API endpoint
    addToast(`Invitation sent to ${email}`, "success");
    setEmail("");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔗 Share "{song.title}"</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Privacy status – FR-16 */}
        <div className="form-group">
          <label className="form-label">Privacy Status</label>
          <div style={{ display: "flex", gap: 10 }}>
            <span className={`badge badge-${song.privacy_status}`}>
              {song.privacy_status === "public" ? "🌐 Public" : "🔒 Private"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", alignSelf: "center" }}>
              (Change in Admin panel)
            </span>
          </div>
        </div>

        {/* Shareable link – FR-17 */}
        <div className="form-group">
          <label className="form-label">Shareable Link</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-control"
              value={shareUrl}
              readOnly
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={copyLink}>Copy</button>
          </div>
        </div>

        {/* Email invitation – FR-18 */}
        <div className="form-group">
          <label className="form-label">Invite by Email</label>
          <form onSubmit={sendInvite} style={{ display: "flex", gap: 8 }}>
            <input
              className="form-control"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" type="submit">Send</button>
          </form>
        </div>

        <button className="btn btn-ghost" style={{ width: "100%" }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
