
import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import MiniPlayer from "../music/MiniPlayer";
import { useMusicPlayer } from "../../contexts/MusicPlayerContext";

export default function AppLayout() {
  const { currentSong } = useMusicPlayer();

  return (
    <div className="min-h-screen bg-background">
      <div className={`pb-16 ${currentSong ? "pb-32" : "pb-16"}`}>
        <Outlet />
      </div>
      {currentSong && <MiniPlayer />}
      <BottomNav />
    </div>
  );
}


