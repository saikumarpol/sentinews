"use client";

import React, { useEffect, useState } from "react";
import { fetchTopGainers, fetchTopLosers } from "@/lib/api";
import "./GainersLosers.css";

function LoadingSkeleton() {
  return (
    <div className="gl-loading">
      {[...Array(5)].map((_, i) => <div key={i} className="gl-shimmer" />)}
    </div>
  );
}

function StockRow({ item, rank, type }) {
  const pct  = item.change_pct;
  const dir  = type === "gainers" ? "up" : "down";
  const arrow = type === "gainers" ? "▲" : "▼";

  return (
    <div className="gl-row">
      <span className="gl-rank">#{rank}</span>
      <span className="gl-symbol">{item.symbol}</span>
      {item.name && item.name !== item.symbol && (
        <span className="gl-name">{item.name}</span>
      )}
      {item.last_price != null && (
        <span className="gl-price">
          ₹{Number(item.last_price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
      )}
      {pct != null && (
        <span className={`gl-pct ${dir}`}>
          {arrow} {Math.abs(pct).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function Panel({ title, icon, type, data, loading, error }) {
  const source = data[0]?.source || "";
  return (
    <div className={`gl-panel ${type}`}>
      <div className="gl-panel__header">
        <span className="gl-icon">{icon}</span>
        <h3>{title}</h3>
        {source && <span className="gl-source-badge">{source}</span>}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="gl-error">{error}</div>
      ) : data.length === 0 ? (
        <div className="gl-error">No data — market may be closed</div>
      ) : (
        <>
          <div className="gl-list">
            {data.slice(0, 8).map((item, i) => (
              <StockRow key={item.symbol} item={item} rank={i + 1} type={type} />
            ))}
          </div>
          <div className="gl-footer">
            NSE · Live during market hours (Mon–Fri 9:15–15:30 IST)
          </div>
        </>
      )}
    </div>
  );
}

export default function GainersLosers() {
  const [gainers, setGainers]   = useState([]);
  const [losers, setLosers]     = useState([]);
  const [gLoading, setGLoading] = useState(true);
  const [lLoading, setLLoading] = useState(true);
  const [gError, setGError]     = useState("");
  const [lError, setLError]     = useState("");

  const load = () => {
    setGLoading(true);
    setLLoading(true);

    fetchTopGainers()
      .then((d) => setGainers(d.gainers || []))
      .catch((e) => setGError(e.message || "Failed to load gainers"))
      .finally(() => setGLoading(false));

    fetchTopLosers()
      .then((d) => setLosers(d.losers || []))
      .catch((e) => setLError(e.message || "Failed to load losers"))
      .finally(() => setLLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000); 
    return () => clearInterval(id);
  }, []);

  return (
    <div className="gl-container">
      <Panel
        title="Top Gainers"
        icon="🚀"
        type="gainers"
        data={gainers}
        loading={gLoading}
        error={gError}
      />
      <Panel
        title="Top Losers"
        icon="📉"
        type="losers"
        data={losers}
        loading={lLoading}
        error={lError}
      />
    </div>
  );
}
