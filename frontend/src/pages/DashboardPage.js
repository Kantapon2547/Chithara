import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Music,
  TrendingUp,
  Clock,
  Play,
  ArrowRight,
  Zap,
  Headphones,
} from "lucide-react";

import { fetchSongs } from "../api/client";
import "../styles/Dashboard.css";

export default function DashboardPage() {
  const [songs, setSongs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSongs();
        setSongs(data.songs || []);
      } catch (err) {
        console.error("Failed to load songs:", err);
      }
    };
    load();
  }, []);

  // safer: only show songs with audio
  const recent = songs.filter((s) => s.audio_url).slice(0, 4);

  // safer audio play handler
  const playAudio = (url) => {
    if (!url) return;

    const audio = new Audio(url);
    audio.play().catch((err) => {
      console.error("Audio play failed:", err);
    });
  };

  return (
    <div className="dash">

      {/* HERO */}
      <div className="hero-glass">
        <div className="hero-content">
          <p className="muted">Welcome back</p>

          <h1>
            Make something <span className="gradient-text">extraordinary</span>
          </h1>

          <p className="muted small">
            Generate AI music in seconds with Chithara
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/generate")}
          >
            <Sparkles size={16} />
            Generate Song
          </button>
        </div>

        <div className="hero-blobs" />
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="glass-card">
          <Music />
          <p className="label">Total Songs</p>
          <h2>{songs.length}</h2>
        </div>

        <div className="glass-card">
          <Headphones />
          <p className="label">Plays</p>
          <h2>{songs.reduce((sum, s) => sum + (s.plays || 0), 0)}</h2>
        </div>

        <div className="glass-card">
          <Clock />
          <p className="label">Minutes</p>
          <h2>184</h2>
        </div>

        <div className="glass-card highlight">
          <Zap />
          <p className="label">Quota</p>
          <h2>12 / 25</h2>
        </div>
      </div>

      {/* RECENT SONGS */}
      <div className="section">
        <div className="section-header">
          <h3>Recently generated</h3>

          <Link to="/library">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="song-grid">
          {recent.map((song) => (
            <div key={song.id} className="song-glass-card">

              <div className="cover" />

              <h4>{song.title || "Untitled"}</h4>

              <p>
                {song.genre || "Unknown"} • {song.mood || "Unknown"}
              </p>

              <button
                onClick={() => playAudio(song.audio_url)}
              >
                <Play size={14} />
                Play
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="bottom-grid">

        <div className="glass-panel">
          <div className="panel-title">
            <TrendingUp size={16} />
            Generation Activity
          </div>

          <div className="bars">
            {[40, 65, 30, 80, 55, 90, 70].map((h, idx) => (
              <div key={idx} className="bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-title">Top Genres</div>

          <ul>
            <li>🎧 Cinematic</li>
            <li>🎹 Lo-fi</li>
            <li>⚡ Electronic</li>
            <li>🎷 Jazz</li>
          </ul>
        </div>

      </div>
    </div>
  );
}