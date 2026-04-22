import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

const Ctx = createContext(null);

export function PlayerProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef(new Audio());

  // ==================================================
  // SYNC VOLUME
  // ==================================================
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // ==================================================
  // SYNC PROGRESS
  // ==================================================
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

  // ==================================================
  // GET AUDIO URL (🔥 FIX)
  // ==================================================
  const getAudioUrl = (track) => {
    return (
      track.audio_url ||
      (track.audio_urls && track.audio_urls.length > 0
        ? track.audio_urls[0]
        : null)
    );
  };

  // ==================================================
  // PLAY
  // ==================================================
  const play = (track, q = []) => {
    const url = getAudioUrl(track);

    if (!url) {
      console.error("❌ No audio source found", track);
      return;
    }

    console.log("▶ Playing:", url);

    const audio = audioRef.current;

    // only change src if different
    if (audio.src !== url) {
      audio.src = url;
    }

    audio
      .play()
      .then(() => {
        setCurrent(track);
        setQueue(q);
        setIsPlaying(true);
      })
      .catch((err) => {
        console.error("Playback error:", err);
      });
  };

  // ==================================================
  // TOGGLE
  // ==================================================
  const toggle = () => {
    const audio = audioRef.current;

    if (!audio.src) return;

    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  // ==================================================
  // SEEK
  // ==================================================
  const seek = (p) => {
    const audio = audioRef.current;
    if (!audio.duration) return;

    audio.currentTime = p * audio.duration;
    setProgress(p);
  };

  // ==================================================
  // NEXT / PREV
  // ==================================================
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

  // ==================================================
  // AUTO END → NEXT
  // ==================================================
  useEffect(() => {
    const audio = audioRef.current;

    const onEnd = () => {
      next();
    };

    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("ended", onEnd);
    };
  });

  // ==================================================
  // CONTEXT
  // ==================================================
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