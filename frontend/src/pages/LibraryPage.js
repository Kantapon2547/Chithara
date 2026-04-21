// src/pages/LibraryPage.js
import React, { useState, useEffect } from "react";
import { fetchSongs, deleteSong } from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import ShareModal from "../components/ShareModal";
import "../styles/LibraryPage.css";

export default function LibraryPage() {
  const { play, current, isPlaying, toggle } = usePlayer();

  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState("");
  const [shareSong, setShareSong] = useState(null);

  useEffect(() => {
    fetchSongs().then((d) => setSongs(d.songs || []));
  }, []);

  const filtered = songs.filter(
    (s) =>
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      (s.prompt || "").toLowerCase().includes(search.toLowerCase())
  );

  const getTimeAgo = (date) => {
    if (!date) return "Recently";
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this song?");
    if (!confirmDelete) return;

    try {
      await deleteSong(id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  return (
    <div className="library">

      {/* HEADER */}
      <div className="library-header">
        <h1>Your Library</h1>
        <p>{filtered.length} songs · all your AI-generated tracks</p>
      </div>

      {/* SEARCH */}
      <div className="library-search">
        <input
          placeholder="🔍 Search by title or prompt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="empty">
          <h3>No songs found</h3>
          <p>Try a different search</p>
        </div>
      ) : (
        <div className="song-grid">
          {filtered.map((song, i) => {
            const isCurrent = current?.id === song.id;

            const gradient = `linear-gradient(135deg,
              hsl(${260 + i * 20},70%,60%),
              hsl(${220 + i * 15},70%,55%)
            )`;

            return (
              <div className="song-card" key={song.id}>

                {/* COVER */}
                <div className="cover" style={{ background: gradient }}>

                  {song.generation_status === "ready" && (
                    <div className="status">READY</div>
                  )}

                  {song.audio_url && (
                    <button
                      className="play-btn"
                      onClick={() =>
                        isCurrent ? toggle() : play(song, filtered)
                      }
                    >
                      {isCurrent && isPlaying ? "⏸" : "▶"}
                    </button>
                  )}
                </div>

                {/* INFO */}
                <div className="song-info">
                  <h3>{song.title || "Untitled"}</h3>
                  <p>{song.prompt || "AI generated track"}</p>

                  <div className="tags">
                    {song.genre && <span>{song.genre}</span>}
                    {song.mood && <span>{song.mood}</span>}
                    {song.occasion && <span>{song.occasion}</span>}
                  </div>

                  {/* FOOTER */}
                  <div className="card-footer">
                    <span>{getTimeAgo(song.created_at)}</span>

                    <div className="actions">
                      <button
                        disabled={!song.audio_url}
                        onClick={() => {
                          if (!song.audio_url) return;
                          const a = document.createElement("a");
                          a.href = song.audio_url;
                          a.download = `${song.title}.mp3`;
                          a.click();
                        }}
                      >
                        ⬇
                      </button>

                      <button onClick={() => setShareSong(song)}>
                        🔗
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(song.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* SHARE MODAL */}
      {shareSong && (
        <ShareModal
          song={shareSong}
          onClose={() => setShareSong(null)}
        />
      )}
    </div>
  );
}