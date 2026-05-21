"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchLiveIndices, fetchMarketStatus } from "@/lib/api";
import "./IndicesTickerBar.css";

const INDEX_SYMBOLS = {
  "NIFTY 50":         "NIFTY",
  "NIFTY BANK":       "BANK",
  "NIFTY IT":         "IT",
  "NIFTY MID 100":    "MID",
  "NIFTY SML 100":    "SML",
  "NIFTY AUTO":       "AUTO",
  "NIFTY FMCG":       "FMCG",
  "NIFTY PHARMA":     "PHARMA",
  "NIFTY METAL":      "METAL",
  "INDIA VIX":        "VIX",
  "SENSEX":           "SENSEX",
};

function fmt(val) {
  if (val == null) return "—";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function TickerItem({ item, prevPrice }) {
  const [flash, setFlash] = useState("");
  const price = item.last_price;

  useEffect(() => {
    if (prevPrice == null || price == null || prevPrice === price) return;
    const cls = price > prevPrice ? "price-flash-up" : "price-flash-down";
    setFlash(cls);
    const t = setTimeout(() => setFlash(""), 700);
    return () => clearTimeout(t);
  }, [price, prevPrice]);

  const pct = item.change_pct;
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "●";

  return (
    <div className={`ticker-item ${flash}`}>
      <span className="ticker-item__name">
        {INDEX_SYMBOLS[item.name] || item.name}
      </span>
      <span className="ticker-item__price">{fmt(price)}</span>
      {pct != null && (
        <span className={`ticker-item__change ${dir}`}>
          {arrow} {Math.abs(pct).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function IndicesTickerBar() {
  const [indices, setIndices]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [marketOpen, setMarketOpen] = useState(null);
  const prevPrices = useRef({});

  const load = async () => {
    try {
      const [idxData, statusData] = await Promise.all([
        fetchLiveIndices(),
        fetchMarketStatus(),
      ]);

      const items = idxData.indices || [];
      const prev = {};
      indices.forEach((i) => { prev[i.name] = i.last_price; });
      prevPrices.current = prev;

      setIndices(items);
      const st = statusData?.status?.marketStatus || "";
      setMarketOpen(st.toLowerCase().includes("open"));
    } catch {
      // silent — ticker is non-critical
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const displayItems = indices.filter((i) => i.last_price != null);

  return (
    <div className="ticker-bar">
      <div className="ticker-bar__status">
        <span className={`market-dot ${marketOpen === false ? "closed" : ""}`} />
        <span>
          {marketOpen === true
            ? "NSE Market Open · Live"
            : marketOpen === false
            ? "NSE Market Closed · Last Close"
            : "NSE Market Data"}
        </span>
        <span style={{ marginLeft: "auto" }}>
          {mounted && new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
          })} {mounted && "IST"}
        </span>
      </div>

      {loading ? (
        <div className="ticker-bar__loading">
          <div className="ticker-shimmer">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shimmer-item" />
            ))}
          </div>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="ticker-bar__loading">
          No index data available — market may be closed
        </div>
      ) : (
        <div className="ticker-bar__track">
          <div className="ticker-bar__scroll">
            {[...displayItems, ...displayItems].map((item, i) => (
              <TickerItem
                key={`${item.name}-${i}`}
                item={item}
                prevPrice={prevPrices.current[item.name]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
