import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchAlbumSongs,
  updateAlbum,
  deleteAlbum,
} from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import "../styles/AlbumPage.css";

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { play, current, isPlaying, toggle } = usePlayer();

  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  // =========================
  // LOAD ALBUM (FIXED)
  // =========================
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetchAlbumSongs(id);

      setAlbum(res.album);
      setSongs(res.songs || []);
      setTitle(res.album?.title || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // allow external refresh (modal add song etc.)
  useEffect(() => {
    window.refreshAlbum = load;

    return () => {
      window.refreshAlbum = null;
    };
  }, [load]);

  // =========================
  // UPDATE TITLE
  // =========================
  const handleUpdate = async () => {
    try {
      const res = await updateAlbum(id, title);
      setAlbum(res.album);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    if (!window.confirm("Delete this album?")) return;

    try {
      await deleteAlbum(id);
      navigate("/library");
    } catch (err) {
      alert(err.message);
    }
  };

  // =========================
  // SHARE (EMAIL)
  // =========================
  const handleShare = async () => {
    const emails = prompt("Enter emails (comma separated)");
    if (!emails) return;

    try {
      const res = await fetch(
        `http://localhost:8000/api/albums/${id}/share/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
          body: JSON.stringify({
            emails: emails.split(",").map((e) => e.trim()),
          }),
        }
      );

      const data = await res.json();
      alert("Shared: " + data.url);
    } catch (err) {
      alert("Share failed");
    }
  };

  // =========================
  // COVER IMAGE (URL VERSION)
  // =========================
  const handleCover = async () => {
    const url = prompt("Paste cover image URL");
    if (!url) return;

    try {
      await fetch(`http://localhost:8000/api/albums/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: JSON.stringify({ cover_image: url }),
      });

      setAlbum((prev) => ({ ...prev, cover_image: url }));
    } catch (err) {
      alert("Failed to update cover");
    }
  };

  // =========================
  // UI
  // =========================
  if (loading) return <div className="album-page">Loading...</div>;

  return (
    <div className="album-page">

      {/* COVER */}
      {album?.cover_image && (
        <img
          src={album.cover_image}
          className="album-cover"
          alt="cover"
        />
      )}

      {/* HEADER */}
      <div className="album-header">
        <h1>{album?.title}</h1>
        <p>{songs.length} songs</p>

        {editing && (
          <div className="edit-box">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button onClick={handleUpdate}>Save</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="album-actions">
        <button onClick={() => setEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
        <button onClick={handleShare}>Share</button>
        <button onClick={handleCover}>Add Cover</button>
      </div>

      {/* SONGS */}
      <div className="album-songs">
        {songs.length === 0 ? (
          <p>No songs in this album</p>
        ) : (
          songs.map((song) => {
            const isCurrent = current?.id === song.id;

            return (
              <div
                key={song.id}
                className="album-song-card"
                onClick={() =>
                  isCurrent ? toggle() : play(song, songs)
                }
              >
                <div>
                  <h3>{song.title}</h3>
                  <p>{song.genre}</p>
                </div>

                <button className="play-btn">
                  {isCurrent && isPlaying ? "⏸" : "▶"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}