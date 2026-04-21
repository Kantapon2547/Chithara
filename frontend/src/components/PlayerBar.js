import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Share2,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import "../styles/PlayerBar.css";

function fmt(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    current,
    isPlaying,
    toggle,
    next,
    prev,
    progress,
    seek,
    volume,
    setVolume,
  } = usePlayer();

  if (!current) return null;

  const dur = current.duration || 180;
  const elapsed = dur * progress;

  return (
    <div className="player-bar">
      <div className="player-container">

        {/* TRACK */}
        <div className="track-info">
          <div className="cover">
            {current.title.charAt(0)}
          </div>

          <div className="meta">
            <p className="title">{current.title}</p>
            <p className="artist">
              {current.artist || "Chithara AI"}
            </p>
          </div>

          <button className="icon-btn">
            <Heart size={16} />
          </button>
        </div>

        {/* CONTROLS */}
        <div className="controls">
          <div className="buttons">
            <button onClick={prev}>
              <SkipBack size={16} />
            </button>

            <button className="play-btn" onClick={toggle}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button onClick={next}>
              <SkipForward size={16} />
            </button>
          </div>

          <div className="progress">
            <span>{fmt(elapsed)}</span>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
            />

            <span>{fmt(dur)}</span>
          </div>
        </div>

        {/* VOLUME */}
        <div className="volume">
          <button>
            <Share2 size={16} />
          </button>

          <Volume2 size={16} />

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>

      </div>
    </div>
  );
}