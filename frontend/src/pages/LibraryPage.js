// src/pages/LibraryPage.js
import React, { useState, useEffect } from "react";
import {
  fetchSongs,
  deleteSong,
  downloadSong,
  fetchAlbums,
} from "../api/client";

import { usePlayer } from "../context/PlayerContext";
import ShareModal from "../components/ShareModal";
import AddToAlbumModal from "../components/AlbumModal";

import "../styles/LibraryPage.css";

export default function LibraryPage() {
  const { play, current, isPlaying, toggle } = usePlayer();

  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("songs");

  const [shareSong, setShareSong] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  const [downloadingId, setDownloadingId] = useState(null);

  // ================= LOCAL COVER STATE =================
  const [covers, setCovers] = useState({});

  useEffect(() => {
    fetchSongs().then((d) => setSongs(d.songs || []));
    fetchAlbums().then((d) => setAlbums(d.albums || []));

    const saved = JSON.parse(localStorage.getItem("song_covers") || "{}");
    setCovers(saved);
  }, []);

  // ================= SAVE COVER =================
  const handleSetCover = (songId, file) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result;

      const updated = {
        ...covers,
        [songId]: base64,
      };

      setCovers(updated);
      localStorage.setItem("song_covers", JSON.stringify(updated));
    };

    reader.readAsDataURL(file);
  };

  // ================= FILTER =================
  const filteredSongs = songs.filter(
    (s) =>
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      (s.genre || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredAlbums = albums.filter((a) =>
    a.title?.toLowerCase().includes(search.toLowerCase())
  );

  // ================= TIME =================
  const getTimeAgo = (date) => {
    if (!date) return "Recently";
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this song?")) return;

    try {
      await deleteSong(id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ================= DOWNLOAD =================
  const handleDownload = async (song) => {
    try {
      setDownloadingId(song.id);
      await downloadSong(song.id, song.title);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="library">

      {/* HEADER */}
      <div className="library-header">
        <h1>Your Library</h1>
        <p>
          {tab === "songs"
            ? `${filteredSongs.length} songs`
            : `${filteredAlbums.length} albums`}
        </p>
      </div>

      {/* TABS */}
      <div className="library-tabs">
        <button
          className={tab === "songs" ? "active" : ""}
          onClick={() => setTab("songs")}
        >
          🎵 Songs
        </button>

        <button
          className={tab === "albums" ? "active" : ""}
          onClick={() => setTab("albums")}
        >
          📀 Albums
        </button>
      </div>

      {/* SEARCH */}
      <div className="library-search">
        <input
          placeholder={tab === "songs" ? "🔍 Search songs..." : "🔍 Search albums..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ================= SONGS ================= */}
      {tab === "songs" &&
        (filteredSongs.length === 0 ? (
          <div className="empty">
            <h3>No songs found</h3>
          </div>
        ) : (
          <div className="song-grid">
            {filteredSongs.map((song, i) => {
              const isCurrent = current?.id === song.id;

              const gradient = `linear-gradient(135deg,
                hsl(${260 + i * 20},70%,60%),
                hsl(${220 + i * 15},70%,55%)
              )`;

              const audioUrl =
                (song.audio_urls &&
                  song.audio_urls.find((u) => u && u.includes(".mp3"))) ||
                (song.audio_url && song.audio_url.includes(".mp3")
                  ? song.audio_url
                  : null);

              return (
                <div className="song-card" key={song.id}>

                  {/* COVER */}
                  <div
                    className="cover"
                    style={{
                      backgroundImage: covers[song.id]
                        ? `url(${covers[song.id]})`
                        : gradient,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {song.generation_status === "READY" && (
                      <div className="status">READY</div>
                    )}

                    {audioUrl && (
                      <button
                        className="play-btn"
                        onClick={() => {
                          const playableSong = { ...song, audio_url: audioUrl };
                          isCurrent ? toggle() : play(playableSong, filteredSongs);
                        }}
                      >
                        {isCurrent && isPlaying ? "⏸" : "▶"}
                      </button>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="song-info">
                    <h3>{song.title || "Untitled"}</h3>
                    <p>{song.genre}</p>

                    <div className="tags">
                      {song.genre && <span>{song.genre}</span>}
                      {song.mood && <span>{song.mood}</span>}
                      {song.occasion && <span>{song.occasion}</span>}
                    </div>

                    <div className="card-footer">
                      <span>{getTimeAgo(song.created_at)}</span>

                      <div className="actions">

                        {/* COVER UPLOAD */}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          id={`cover-${song.id}`}
                          onChange={(e) =>
                            handleSetCover(song.id, e.target.files[0])
                          }
                        />

                        <label htmlFor={`cover-${song.id}`}>
                          🖼
                        </label>

                        {/* DOWNLOAD */}
                        <button
                          disabled={!audioUrl || downloadingId === song.id}
                          onClick={() => handleDownload(song)}
                        >
                          {downloadingId === song.id ? "⏳" : "⬇"}
                        </button>

                        <button onClick={() => setSelectedSong(song)}>➕</button>
                        <button onClick={() => setShareSong(song)}>🔗</button>
                        <button onClick={() => handleDelete(song.id)}>🗑</button>

                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* ================= ALBUMS ================= */}
      {tab === "albums" &&
        (filteredAlbums.length === 0 ? (
          <div className="empty">
            <h3>No albums found</h3>
          </div>
        ) : (
          <div className="album-grid">
            {filteredAlbums.map((album) => (
              <div className="album-card" key={album.id}>

                <div
                  className="album-cover"
                  style={{
                    backgroundImage: album.cover_image
                      ? `url(${album.cover_image})`
                      : "linear-gradient(135deg, #4f46e5, #9333ea)",
                  }}
                />

                <div className="album-info">
                  <h3>{album.title}</h3>
                  <p>{album.song_count} songs</p>

                  <button>Open</button>
                </div>

              </div>
            ))}
          </div>
        ))}

      {/* MODALS */}
      {shareSong && (
        <ShareModal song={shareSong} onClose={() => setShareSong(null)} />
      )}

      {selectedSong && (
        <AddToAlbumModal song={selectedSong} onClose={() => setSelectedSong(null)} />
      )}

    </div>
  );
}