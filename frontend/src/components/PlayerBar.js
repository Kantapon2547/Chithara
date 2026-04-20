// src/components/PlayerBar.js  – FR-13: play, pause, skip, rewind, fast-forward
import React from "react";
import { usePlayer } from "../context/PlayerContext";

function fmt(secs) {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { currentSong, isPlaying, progress, duration, volume, togglePlay, seek, changeVolume, skip } = usePlayer();

  if (!currentSong) {
    return (
      <div className="player-bar">
        <div className="player-info" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          🎵 No song playing — select one from your library
        </div>
      </div>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="player-bar">
      {/* Song info */}
      <div className="player-info">
        <div className="player-thumb">🎵</div>
        <div className="player-track">
          <div className="player-track-title">{currentSong.title}</div>
          <div className="player-track-meta">{currentSong.genre} · {currentSong.mood}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="player-controls">
        <div className="player-btns">
          {/* Rewind 10s */}
          <button className="player-btn" onClick={() => skip(-10)} title="Rewind 10s">⏮</button>
          {/* Rewind 5s */}
          <button className="player-btn" onClick={() => skip(-5)} title="Rewind 5s">⏪</button>
          {/* Play/Pause */}
          <button className="player-btn play" onClick={togglePlay}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          {/* Fast-forward 5s */}
          <button className="player-btn" onClick={() => skip(5)} title="Forward 5s">⏩</button>
          {/* Fast-forward 10s */}
          <button className="player-btn" onClick={() => skip(10)} title="Forward 10s">⏭</button>
        </div>

        {/* Progress bar */}
        <div className="player-progress">
          <span className="progress-time">{fmt(progress)}</span>
          <div
            className="progress-bar"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-time">{fmt(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="player-volume">
        <span>🔊</span>
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={e => changeVolume(parseFloat(e.target.value))}
          className="volume-slider"
        />
      </div>
    </div>
  );
}
