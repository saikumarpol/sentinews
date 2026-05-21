"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { 
    fetchStockDetail, fetchStockHistory, fetchStockNews, fetchLiveQuote, 
    addPortfolioHolding 
} from "@/lib/api";
import TradingViewChart from "@/components/charts/TradingViewChart";
import QuickChart from "@/components/charts/QuickChart";

const pos = "#16a34a";
const neg = "#dc2626";
const neu = "#6b7280";
const pnlColor = (v) => (v > 0 ? pos : v < 0 ? neg : neu);

const RANGES = ["1W", "1M", "3M", "1Y", "5Y"];

function StatPill({ label, value, colorValue }) {
  const col = colorValue != null ? pnlColor(colorValue) : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ fontSize: "1rem", fontWeight: 600, color: col || "inherit" }}>
        {value ?? "N/A"}
      </span>
    </div>
  );
}

function RangeBar({ low52, high52, current }) {
  if (low52 == null || high52 == null || current == null) return null;
  const range = high52 - low52;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((current - low52) / range) * 100)) : 50;
  return (
    <div>
      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 4 }}>52-week range</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
        <span>{low52.toFixed(2)}</span>
        <div style={{ flex: 1, position: "relative", height: 6, background: "#e5e7eb", borderRadius: 3 }}>
          <div style={{
            position: "absolute", height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #f59e0b, #10b981)",
            borderRadius: 3
          }} />
          <div style={{
            position: "absolute", top: -3, left: `${pct}%`,
            width: 12, height: 12, borderRadius: "50%",
            background: "#1e40af", border: "2px solid white",
            transform: "translateX(-50%)"
          }} />
        </div>
        <span>{high52.toFixed(2)}</span>
      </div>
    </div>
  );
}

const MACD_SIGNAL_MAP = (macd) => {
  if (!macd) return { text: "N/A", color: neu };
  if (macd.value > macd.signal && macd.histogram > 0) return { text: "Bullish crossover", color: pos };
  if (macd.value < macd.signal && macd.histogram < 0) return { text: "Bearish crossover", color: neg };
  return { text: "Neutral", color: neu };
};

function NewsItem({ item }) {
  const sentColor = item.sentiment > 0.2 ? pos : item.sentiment < -0.2 ? neg : neu;
  const time = item.published_at
    ? new Date(item.published_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <article style={{
      padding: "12px 0", borderBottom: "1px solid #f3f4f6",
      display: "flex", flexDirection: "column", gap: 4
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9ca3af" }}>
        <span>{item.source}</span>
        <span>{time}</span>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer"
        style={{ fontWeight: 600, fontSize: "0.88rem", color: "#111827", textDecoration: "none", lineHeight: 1.4 }}>
        {item.headline}
      </a>
      {item.summary && (
        <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
          {item.summary.length > 180 ? item.summary.slice(0, 180) + "…" : item.summary}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: sentColor }}>
          {item.sentiment > 0.2 ? "▲ Bullish" : item.sentiment < -0.2 ? "▼ Bearish" : "● Neutral"}
          {" "}({item.sentiment?.toFixed(2)})
        </span>
      </div>
    </article>
  );
}

export default function StockDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const symbol = params.symbol;
  const router = useRouter();
  const { authToken } = useAuth();
  const { watchlist, setWatchlist } = useWatchlist();

  const [detail, setDetail]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [news, setNews]         = useState([]);
  const [range, setRange]       = useState("1Y");
  const [loading, setLoading]   = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [chartMode, setChartMode] = useState("advanced");

  const inWatchlist = watchlist?.includes(symbol);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetchStockDetail(symbol),
      fetchStockHistory(symbol, range),
      fetchStockNews(symbol),
    ])
      .then(([d, h, n]) => {
        setDetail(d);
        setHistory(h.history || []);
        setNews(n.news || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol || loading) return;
    setHistLoading(true);
    fetchStockHistory(symbol, range)
      .then(h => setHistory(h.history || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [range]);

  const snap = detail?.snapshot;
  const isUp = snap?.change_1d_pct >= 0;
  const chartColor = (detail?.performance?.[range] ?? 0) >= 0 ? pos : neg;

  const toggleWatchlist = () => {
    if (inWatchlist) setWatchlist(watchlist.filter(s => s !== symbol));
    else setWatchlist([symbol, ...watchlist]);
  };

  if (loading) return <div className="page-loading">Loading terminal...</div>;
  if (error) return <div className="page-error">Error: {error}</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 3rem", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{detail.symbol}</h1>
            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 4, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>{detail.exchange}</span>
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 2 }}>{detail.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>₹{snap?.last_price?.toFixed(2) ?? "—"}</div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: isUp ? pos : neg }}>
             {isUp ? "▲" : "▼"} {Math.abs(snap?.change_1d ?? 0).toFixed(2)} ({isUp ? "+" : ""}{snap?.change_1d_pct?.toFixed(2) ?? "—"}%)
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "18px", marginBottom: 20 }}>
          <StatPill label="Market Cap" value={formatMarketCap(snap?.market_cap)} />
          <StatPill label="P/E Ratio" value={snap?.pe_ratio?.toFixed(2)} />
          <StatPill label="Div Yield" value={snap?.dividend_yield != null ? `${snap.dividend_yield.toFixed(2)}%` : "N/A"} />
          <StatPill label="Volume" value={formatVol(snap?.volume)} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Market Chart</h3>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 }}>
              <button onClick={() => setChartMode("quick")} style={{ ...toggleBtn, background: chartMode === "quick" ? "white" : "transparent", color: chartMode === "quick" ? "#1d4ed8" : "#94a3b8" }}>Quick View</button>
              <button onClick={() => setChartMode("advanced")} style={{ ...toggleBtn, background: chartMode === "advanced" ? "white" : "transparent", color: chartMode === "advanced" ? "#1d4ed8" : "#94a3b8" }}>Pro Terminal</button>
            </div>
          </div>
          <button onClick={toggleWatchlist} className="read-btn" style={{ background: inWatchlist ? "var(--neon-teal)" : undefined }}>
            {inWatchlist ? "★ In Watchlist" : "☆ + Watchlist"}
          </button>
        </div>

        {chartMode === "advanced" ? (
          <TradingViewChart symbol={symbol} exchange={detail.exchange} />
        ) : (
          <QuickChart data={history.map(h => ({ date: h.date, close: h.close }))} color={chartColor} ma50Value={detail.technicals?.ma50} />
        )}
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-subtle)", marginBottom: 20 }}>
        {[["overview", "Overview"], ["technicals", "Technicals"], ["news", `News (${news.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding: "8px 18px", border: "none", background: "none", cursor: "pointer", 
            fontSize: "0.88rem", fontWeight: activeTab === id ? 700 : 400,
            color: activeTab === id ? "var(--neon-cyan)" : "var(--text-secondary)",
            borderBottom: activeTab === id ? "2px solid var(--neon-cyan)" : "2px solid transparent",
            marginBottom: -1
          }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
             <div className="glass-card" style={{ padding: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Key Indicators</h4>
                <StatPill label="52W High" value={snap?.high_52w?.toFixed(2)} />
                <StatPill label="52W Low" value={snap?.low_52w?.toFixed(2)} />
             </div>
             <div className="glass-card" style={{ padding: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Summary</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{detail.description?.slice(0, 300)}...</p>
             </div>
          </div>
      )}

      {activeTab === "news" && (
        <div className="glass-card" style={{ padding: 16 }}>
          {news.length === 0 ? <p>No news found.</p> : news.map(item => <NewsItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

const toggleBtn = { padding: "6px 14px", border: "none", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" };

function formatMarketCap(v) {
  if (v == null) return "N/A";
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7)  return `₹${(v / 1e7).toFixed(2)}Cr`;
  return `₹${v.toFixed(0)}`;
}

function formatVol(v) {
  if (v == null) return "N/A";
  if (v >= 1e7)  return `${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5)  return `${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3)  return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}
