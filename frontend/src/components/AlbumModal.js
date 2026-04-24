// src/components/AlbumModal.js
import React, { useState, useEffect } from "react";
import { fetchAlbums, createAlbum, addSongToAlbum } from "../api/client";
import { useToast } from "../context/ToastContext";
import "../styles/AlbumModal.css";

export default function AddToAlbumModal({ song, onClose }) {
  const { addToast } = useToast();

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");

  // 🔥 Load albums
  useEffect(() => {
    fetchAlbums()
      .then((d) => setAlbums(d.albums || []))
      .catch(() => addToast("Failed to load albums", "error"))
      .finally(() => setLoading(false));
  }, []);

  // 🔥 Add to existing album
  const handleAdd = async (albumId) => {
    try {
      await addSongToAlbum(albumId, song.id);
      addToast(`Added to album!`, "success");
      onClose();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // 🔥 Create new album + add song
  const handleCreate = async () => {
    if (!newAlbumTitle.trim()) return;

    try {
      setCreating(true);

      const res = await createAlbum(newAlbumTitle);
      const album = res.album;

      await addSongToAlbum(album.id, song.id);

      addToast("Album created & song added!", "success");
      onClose();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-header">
          <h3>➕ Add "{song.title}" to Album</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* EXISTING ALBUMS */}
        <div className="modal-section">
          <h4>Your Albums</h4>

          {loading ? (
            <p className="muted">Loading...</p>
          ) : albums.length === 0 ? (
            <p className="muted">No albums yet</p>
          ) : (
            <div className="album-list">
              {albums.map((album) => (
                <div key={album.id} className="album-row">
                  <div>
                    <strong>{album.title}</strong>
                    <p>{album.song_count} songs</p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAdd(album.id)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREATE NEW */}
        <div className="modal-section">
          <h4>Create New Album</h4>

          <div className="create-row">
            <input
              className="form-control"
              placeholder="Album name..."
              value={newAlbumTitle}
              onChange={(e) => setNewAlbumTitle(e.target.value)}
            />

            <button
              className="btn btn-success btn-sm"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "⏳" : "Create"}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>

      </div>
    </div>
  );
}