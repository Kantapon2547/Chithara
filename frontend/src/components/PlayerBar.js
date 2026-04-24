import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Share2,
  Download,
} from "lucide-react";

import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { downloadSong } from "../api/client";
import "../styles/PlayerBar.css";

function fmt(seconds = 0) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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

  const [downloading, setDownloading] = useState(false);

  if (!current?.audio_url) return null;

  const duration = current.duration || 180;

  const safeProgress =
    typeof progress === "number" && !isNaN(progress) ? progress : 0;

  const elapsed = duration * safeProgress;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      await downloadSong(current.id, current.title);
    } catch (err) {
      console.error(err);
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="player-bar">
      <div className="player-container">

        {/* ================= LEFT ================= */}
        <div className="track-info">
          <div
            className="cover"
            style={{
              backgroundImage: current.cover_image
                ? `url(${current.cover_image})`
                : "linear-gradient(135deg, #7c3aed, #06b6d4)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="meta">
            <p className="title">{current?.title || "Untitled"}</p>
            <p className="artist">{current?.artist || "Chithara AI"}</p>
          </div>

          <button className="icon-btn">
            <Heart size={16} />
          </button>
        </div>

        {/* ================= CENTER ================= */}
        <div className="controls">

          <div className="buttons">
            <button onClick={prev}>
              <SkipBack size={18} />
            </button>

            <button className="play-btn" onClick={toggle}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button onClick={next}>
              <SkipForward size={18} />
            </button>
          </div>

          <div className="progress">
            <span>{fmt(elapsed)}</span>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={safeProgress}
              onChange={(e) => seek(parseFloat(e.target.value))}
            />

            <span>{fmt(duration)}</span>
          </div>

        </div>

        {/* ================= RIGHT ================= */}
        <div className="volume">

          <button className="icon-btn">
            <Share2 size={16} />
          </button>

          <button
            className="icon-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={16} />
          </button>

          <Volume2 size={16} />

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume ?? 1}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>

      </div>
    </div>
  );
}