// src/components/AlbumModal.js
import React, { useState, useEffect, useCallback } from "react";
import {
  fetchAlbums,
  createAlbum,
  addSongToAlbum,
} from "../api/client";

import { useToast } from "../context/ToastContext";
import "../styles/AlbumModal.css";

export default function AddToAlbumModal({ song, onClose, onRefresh }) {
  const { addToast } = useToast();

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");

  // =========================
  // LOAD ALBUMS (FIXED)
  // =========================
  const loadAlbums = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAlbums();
      setAlbums(res.albums || []);
    } catch (err) {
      addToast(err.message || "Failed to load albums", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // =========================
  // ADD SONG TO ALBUM
  // =========================
  const handleAdd = async (albumId) => {
    try {
      await addSongToAlbum(albumId, song.id);

      addToast("Added to album!", "success");

      if (onRefresh) {
        await onRefresh(albumId);
      }

      onClose();
    } catch (err) {
      addToast(err.message || "Failed to add song", "error");
    }
  };

  // =========================
  // CREATE + ADD SONG
  // =========================
  const handleCreate = async () => {
    if (!newAlbumTitle.trim()) return;

    try {
      setCreating(true);

      const res = await createAlbum(newAlbumTitle);
      const album = res.album;

      await addSongToAlbum(album.id, song.id);

      addToast("Album created & song added!", "success");

      await loadAlbums(); // refresh modal list

      setNewAlbumTitle("");

      if (onRefresh) {
        await onRefresh(album.id);
      }

      onClose();
    } catch (err) {
      addToast(err.message || "Failed to create album", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h3>➕ Add "{song.title}" to Album</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

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
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>

      </div>
    </div>
  );
}