"use client";

import { useState, useEffect } from "react";

/** Returns the last /game?... URL the player visited, or "/" as fallback. */
export function useLastGameUrl(): string {
  const [url, setUrl] = useState("/");

  useEffect(() => {
    const saved = localStorage.getItem("lastGameUrl");
    if (saved) setUrl(saved);
  }, []);

  return url;
}
