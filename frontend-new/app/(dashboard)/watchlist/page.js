"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { fetchPerformance, searchSymbols, fetchNote, saveNote as apiSaveNote, fetchLiveQuote } from "@/lib/api";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });

const pos = "#00b386"; 
const neg = "#eb5b3c"; 

function WatchlistRow({ ticker, selected, onSelect, onRemove, isComparing, toggleCompare }) {
  const [quote, setQuote] = useState(null);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    let mounted = true;
    let oldPrice = null;
    
    const loadQuote = async () => {
      try {
        const data = await fetchLiveQuote(ticker);
        if (!mounted || !data || data.error) return;
        
        if (oldPrice !== null && data.last_price !== oldPrice) {
          setFlashClass(data.last_price > oldPrice ? "flash-up" : "flash-down");
          setTimeout(() => { if (mounted) setFlashClass(""); }, 1000);
        }
        oldPrice = data.last_price;
        setQuote(data);
      } catch (err) {}
    };

    loadQuote();
    const iv = setInterval(loadQuote, 30000);
    return () => { mounted = false; clearInterval(iv); };
  }, [ticker]);

  const isUp = quote?.change_pct >= 0;
  const isSelected = ticker === selected;

  return (
    <div 
      onClick={() => onSelect(ticker)}
      className={flashClass}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)",
        background: isSelected ? "rgba(0,179,134,0.1)" : "transparent",
        borderLeft: isSelected ? `4px solid ${pos}` : "4px solid transparent",
        transition: "background 0.2s",
        gap: "12px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <input 
            type="checkbox" 
            checked={isComparing} 
            onChange={(e) => { e.stopPropagation(); toggleCompare(ticker); }}
            style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <span style={{ fontWeight: 700 }}>{ticker}</span>
      </div>
      
      {quote ? (
        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 80 }}>
                <span style={{ fontWeight: 600 }}>₹{quote.last_price?.toFixed(2)}</span>
                <span style={{ fontSize: "0.8rem", color: isUp ? pos : neg, fontWeight: 600 }}>
                    {isUp ? "+" : ""}{quote.change_pct?.toFixed(2)}%
                </span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(ticker); }} style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer" }}>✕</button>
        </div>
      ) : (
        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Loading...</span>
      )}
    </div>
  );
}

function ComparisonView({ symbols, authToken }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const results = await Promise.all(symbols.map(s => fetchPerformance(s, authToken)));
                setData(results);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        loadAll();
    }, [symbols, authToken]);

    if (loading) return <div style={{ textAlign: "center", padding: "3rem" }}>Loading comparison...</div>;

    return (
        <div>
            <h3 style={{ marginBottom: 16 }}>Comparison: {symbols.join(" vs ")}</h3>
            <div style={{ height: 300, marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} />
                        <Tooltip />
                        {data.map((d, i) => (
                            <Line key={d.symbol} data={d.history} type="monotone" dataKey="close" name={d.symbol} stroke={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"][i % 4]} strokeWidth={2} dot={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            {/* Table metrics would go here as in original */}
        </div>
    );
}

export default function WatchlistPage() {
  const { watchlist, setWatchlist } = useWatchlist();
  const { authToken } = useAuth();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(watchlist[0] || "");
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [viewMode, setViewMode] = useState("detail");

  const loadPerformance = useCallback(async (symbol) => {
    setLoading(true);
    try {
      const data = await fetchPerformance(symbol, authToken);
      setPerf(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [authToken]);

  useEffect(() => {
    if (selected) loadPerformance(selected);
  }, [selected, loadPerformance]);

  const addTicker = (e) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym && !watchlist.includes(sym)) {
      setWatchlist([sym, ...watchlist]);
      setSelected(sym);
      setInput("");
    }
  };

  const removeTicker = (ticker) => {
    const next = watchlist.filter((t) => t !== ticker);
    setWatchlist(next);
    if (selected === ticker) setSelected(next[0] || "");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1rem", color: "var(--text-primary)" }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Watchlist</h2>
        {selectedForCompare.length > 1 && (
            <button onClick={() => setViewMode(viewMode === "compare" ? "detail" : "compare")} className="read-btn">
                {viewMode === "compare" ? "← Back" : `Compare ${selectedForCompare.length}`}
            </button>
        )}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        <div className="glass-card" style={{ padding: 16 }}>
            <form onSubmit={addTicker} style={{ marginBottom: 16 }}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="+ Find Stock"
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)", color: "inherit", outline: "none" }}
                />
            </form>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
                {watchlist.map((ticker) => (
                    <WatchlistRow 
                        key={ticker} 
                        ticker={ticker} 
                        selected={selected} 
                        onSelect={setSelected} 
                        onRemove={removeTicker} 
                        isComparing={selectedForCompare.includes(ticker)}
                        toggleCompare={(t) => setSelectedForCompare(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                    />
                ))}
            </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
            {viewMode === "compare" ? (
                <ComparisonView symbols={selectedForCompare} authToken={authToken} />
            ) : (
                perf && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                            <h3 style={{ fontSize: "1.8rem", fontWeight: 800 }}>{selected}</h3>
                            <button onClick={() => router.push(`/stock/${selected}`)} className="read-btn">Full Details</button>
                        </div>
                        <div style={{ height: 320, width: "100%" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={perf.history}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="close" stroke={pos} fill="rgba(0,179,134,0.1)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            )}
        </div>
      </div>
    </div>
  );
}
