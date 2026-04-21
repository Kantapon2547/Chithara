import { createContext, useContext, useState, useRef, useEffect } from "react";

const Ctx = createContext(null);

export function PlayerProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef(new Audio());

  /* =========================
     SYNC VOLUME
  ========================= */
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  /* =========================
     SYNC PROGRESS
  ========================= */
  useEffect(() => {
    const audio = audioRef.current;

    const update = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    audio.addEventListener("timeupdate", update);

    return () => {
      audio.removeEventListener("timeupdate", update);
    };
  }, []);

  /* =========================
     PLAY SONG
  ========================= */
  const play = (track, q = []) => {
    if (!track.audio_url) return;

    setCurrent(track);
    setQueue(q);

    const audio = audioRef.current;
    audio.src = track.audio_url;
    audio.play();

    setIsPlaying(true);
  };

  /* =========================
     TOGGLE PLAY
  ========================= */
  const toggle = () => {
    const audio = audioRef.current;

    if (!audio.src) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }

    setIsPlaying(!isPlaying);
  };

  /* =========================
     SEEK
  ========================= */
  const seek = (p) => {
    const audio = audioRef.current;
    if (!audio.duration) return;

    audio.currentTime = p * audio.duration;
    setProgress(p);
  };

  /* =========================
     NEXT / PREV
  ========================= */
  const idx = current
    ? queue.findIndex((t) => t.id === current.id)
    : -1;

  const next = () => {
    if (idx >= 0 && idx < queue.length - 1) {
      play(queue[idx + 1], queue);
    }
  };

  const prev = () => {
    if (idx > 0) {
      play(queue[idx - 1], queue);
    }
  };

  return (
    <Ctx.Provider
      value={{
        current,
        isPlaying,
        progress,
        volume,
        play,
        toggle,
        next,
        prev,
        seek,
        setVolume,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}