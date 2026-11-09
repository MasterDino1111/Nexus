
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { trackPlay } from "@/lib/trackPlay";

const MusicPlayerContext = createContext(null);

export function MusicPlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio());

  // When song changes, load new src
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentSong) return;

    if (currentSong.audio_url) {
      audio.src = currentSong.audio_url;
      audio.load();
      if (isPlaying) audio.play().catch(() => {});
    }

    // Count the play for analytics (never for the uploader's own plays)
    trackPlay(currentSong).catch(() => {});
  }, [currentSong?.id]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentSong?.audio_url) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Track progress
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const dur = audio.duration || 0;
      if (dur > 0) {
        setProgress((audio.currentTime / dur) * 100);
        setDuration(dur);
      }
    };
    const onEnded = () => {
      nextSongRef.current?.();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const nextSongRef = useRef(null);

  const playSong = useCallback((song, songList = []) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setQueue(songList);
    setProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const nextSong = useCallback(() => {
    setQueue(q => {
      setCurrentSong(curr => {
        if (!curr || q.length === 0) return curr;
        const idx = q.findIndex(s => s.id === curr.id);
        const next = q[(idx + 1) % q.length];
        return next;
      });
      return q;
    });
    setProgress(0);
    setIsPlaying(true);
  }, []);

  nextSongRef.current = nextSong;

  const prevSong = useCallback(() => {
    setQueue(q => {
      setCurrentSong(curr => {
        if (!curr || q.length === 0) return curr;
        const idx = q.findIndex(s => s.id === curr.id);
        const prev = idx <= 0 ? q[q.length - 1] : q[idx - 1];
        return prev;
      });
      return q;
    });
    setProgress(0);
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((pct) => {
    const audio = audioRef.current;
    if (audio.duration) {
      audio.currentTime = (pct / 100) * audio.duration;
      setProgress(pct);
    }
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        progress,
        duration,
        setProgress,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seekTo,
        setCurrentSong,
        setIsPlaying,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    return {
      currentSong: null,
      isPlaying: false,
      queue: [],
      progress: 0,
      duration: 0,
      setProgress: () => {},
      playSong: () => {},
      togglePlay: () => {},
      nextSong: () => {},
      prevSong: () => {},
      seekTo: () => {},
      setCurrentSong: () => {},
      setIsPlaying: () => {},
    };
  }
  return context;
}


