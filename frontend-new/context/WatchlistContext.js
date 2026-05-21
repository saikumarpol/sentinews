"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState(["RELIANCE.NS", "HDFCBANK.NS"]);

  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse watchlist", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, setWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export const useWatchlist = () => useContext(WatchlistContext);
