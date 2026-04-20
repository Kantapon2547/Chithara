// src/context/PlayerContext.js
import React, { createContext, useContext, useState, useRef, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [duration, setDuration]       = useState(0);
  const [volume, setVolume]           = useState(0.8);
  const audioRef = useRef(null);

  const play = useCallback((song) => {
    if (!song.audio_url) return;
    if (currentSong?.id === song.id) {
      // toggle
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
      else           { audioRef.current?.play();  setIsPlaying(true);  }
      return;
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.src = song.audio_url;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentSong, isPlaying, volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true);  }
  }, [isPlaying]);

  const seek = useCallback((pct) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = pct * duration;
  }, [duration]);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const skip = useCallback((secs) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(Math.max(0, audioRef.current.currentTime + secs), duration);
  }, [duration]);

  return (
    <PlayerContext.Provider value={{ currentSong, isPlaying, progress, duration, volume, play, togglePlay, seek, changeVolume, skip }}>
      {children}
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setProgress(audioRef.current.currentTime);
        }}
        onDurationChange={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
