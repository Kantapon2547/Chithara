// src/pages/LibraryPage.js
import React, { useState, useEffect, useCallback } from "react";
import { fetchSongs, pollStatus } from "../api/client";
import { usePlayer }  from "../context/PlayerContext";
import { useToast }   from "../context/ToastContext";
import ShareModal      from "../components/ShareModal";

const GENRE_OPTIONS    = ["all","pop","rock","r&b","jazz","classical"];
const OCCASION_OPTIONS = ["all","study","party","sleep","workout"];
const STATUS_MAP = {
  pending:    { label:"Pending",    cls:"badge-pending"    },
  generating: { label:"Generating", cls:"badge-generating" },
  ready:      { label:"Ready",      cls:"badge-ready"      },
  failed:     { label:"Failed",     cls:"badge-failed"     },
};

function genreEmoji(g) {
  return { pop:"🎤", rock:"🎸", "r&b":"🎷", jazz:"🎺", classical:"🎻" }[g] || "🎵";
}

export default function LibraryPage() {
  const { play, currentSong, isPlaying } = usePlayer();
  const { addToast } = useToast();

  const [songs,      setSongs]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");       // FR-14
  const [genreFilter,setGenreFilter]= useState("all");    // FR-15
  const [occFilter,  setOccFilter]  = useState("all");    // FR-15
  const [shareTarget,setShareTarget]= useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchSongs()
      .then(d => setSongs(d.songs || []))
      .catch(() => addToast("Failed to load library", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // Auto-poll any in-progress songs
  useEffect(() => {
    const pending = songs.filter(s =>
      s.task_id && !["ready","failed"].includes(s.generation_status));
    if (!pending.length) return;

    const timers = pending.map(s =>
      setInterval(async () => {
        try {
          const res = await pollStatus(s.task_id);
          if (["SUCCESS","FAILED"].includes(res.job.status)) {
            load();  // refresh list
          }
        } catch {}
      }, 6000)
    );
    return () => timers.forEach(clearInterval);
  }, [songs, load]);

  // Filtered list
  const filtered = songs.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre  = genreFilter === "all" || s.genre === genreFilter;
    const matchOcc    = occFilter   === "all" || s.occasion === occFilter;
    return matchSearch && matchGenre && matchOcc;
  });

  function handlePlay(song) {
    if (!song.audio_url) {
      addToast("No audio available for this song yet.", "info"); return;
    }
    play(song);
  }

  function handleDownload(song) {
    if (!song.audio_url) { addToast("No audio file available.", "info"); return; }
    const a = document.createElement("a");
    a.href = song.audio_url;
    a.download = `${song.title}.mp3`;
    a.click();
    addToast("Download started!", "success");
  }

  return (
    <div>
      <div className="page-header">
        <h1>📚 My Library</h1>
        <p>{songs.length} songs in your collection</p>
      </div>

      {/* Search + filter – FR-14, FR-15 */}
      <div className="search-bar">
        <input
          className="form-control search-input"
          placeholder="🔍 Search by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-control" style={{ width:140 }}
          value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
          {GENRE_OPTIONS.map(g => (
            <option key={g} value={g}>{g === "all" ? "All Genres" : g.toUpperCase()}</option>
          ))}
        </select>
        <select className="form-control" style={{ width:150 }}
          value={occFilter} onChange={e => setOccFilter(e.target.value)}>
          {OCCASION_OPTIONS.map(o => (
            <option key={o} value={o}>{o === "all" ? "All Occasions" : o.charAt(0).toUpperCase()+o.slice(1)}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Refresh</button>
      </div>

      {loading && (
        <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)" }}>
          <div className="spinner" style={{ margin:"0 auto 12px" }} />
          Loading library...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">🎵</div>
          <h3>{songs.length === 0 ? "No songs yet" : "No results found"}</h3>
          <p>{songs.length === 0
            ? "Generate your first song to see it here."
            : "Try adjusting your search or filters."}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="song-list">
          {filtered.map(song => {
            const st       = STATUS_MAP[song.generation_status] || STATUS_MAP.pending;
            const isThisPlaying = currentSong?.id === song.id && isPlaying;

            return (
              <div className="song-card" key={song.id}>
                {/* Thumbnail */}
                <div className="song-thumb">{genreEmoji(song.genre)}</div>

                {/* Info */}
                <div className="song-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-meta">
                    <span>{song.genre?.toUpperCase()}</span>
                    <span>{song.mood}</span>
                    <span>{song.occasion}</span>
                    <span>{song.duration}s</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    <span className={`badge badge-${song.privacy_status}`}>
                      {song.privacy_status === "public" ? "🌐" : "🔒"} {song.privacy_status}
                    </span>
                    {song.strategy && (
                      <span style={{ color:"var(--muted)", fontSize:"0.75rem" }}>
                        via {song.strategy}
                      </span>
                    )}
                  </div>
                  {song.audio_url && (
                    <div className="audio-chip" style={{ marginTop:6 }}>
                      ✅ Audio ready
                    </div>
                  )}
                  {song.generation_status === "generating" && (
                    <div style={{ fontSize:"0.78rem", color:"var(--primary)", marginTop:4 }}>
                      ⏳ Generating... auto-refreshing
                    </div>
                  )}
                </div>

                {/* Actions – FR-12, FR-13, FR-16/17/18 */}
                <div className="song-actions">
                  {/* Play – FR-13 */}
                  <button
                    className="btn btn-icon"
                    title={isThisPlaying ? "Pause" : "Play"}
                    onClick={() => handlePlay(song)}
                    style={isThisPlaying ? { color:"var(--primary)" } : {}}
                  >
                    {isThisPlaying ? "⏸" : "▶"}
                  </button>

                  {/* Share – FR-17, FR-18 */}
                  <button
                    className="btn btn-icon"
                    title="Share"
                    onClick={() => setShareTarget(song)}
                  >
                    🔗
                  </button>

                  {/* Download – FR-12 */}
                  <button
                    className="btn btn-icon"
                    title="Download"
                    onClick={() => handleDownload(song)}
                  >
                    ⬇
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share modal – FR-16, FR-17, FR-18 */}
      {shareTarget && (
        <ShareModal song={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
