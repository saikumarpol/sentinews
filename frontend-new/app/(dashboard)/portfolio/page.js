"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPortfolioSnapshot,
  fetchPortfolioNews,
  addPortfolioHolding,
  removePortfolioHolding
} from "@/lib/api";
import dynamic from "next/dynamic";

const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Treemap = dynamic(() => import("recharts").then((mod) => mod.Treemap), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });

const PIE_COLORS = ["#00b386", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];
const pos = "#00b386";
const neg = "#eb5b3c";

function HeatmapNode({ depth, x, y, width, height, payload, name }) {
  if (depth === 0 || !payload) return null;
  const pnl = payload.pnl_pct || 0;
  let fillStr = pnl > 0 ? pos : pnl < 0 ? neg : "#9ca3af";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: fillStr, stroke: "#fff", strokeWidth: 1 }} />
      {width > 40 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>{name}</text>
      )}
    </g>
  );
}

export default function PortfolioPage() {
  const { authToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");

  const loadAll = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const [snap, newsRes] = await Promise.all([
        fetchPortfolioSnapshot(authToken),
        fetchPortfolioNews(authToken)
      ]);
      setData(snap);
      setNews(newsRes.news || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [authToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const combinedHistory = useMemo(() => {
    if (!data?.history || !data?.benchmark_history) return [];
    const benchMap = {};
    data.benchmark_history.forEach(item => { benchMap[item.date] = item.value; });
    let merged = [];
    let iPort = null, iBench = null;
    data.history.forEach(item => {
        const bVal = benchMap[item.date];
        if (bVal !== undefined) {
             if (iPort === null) { iPort = item.value; iBench = bVal; }
             merged.push({
                 date: item.date,
                 portfolioPct: ((item.value - iPort) / iPort) * 100,
                 benchmarkPct: ((bVal - iBench) / iBench) * 100
             });
        }
    });
    return merged;
  }, [data]);

  if (!authToken) return <div style={{ textAlign: "center", padding: "4rem" }}>Please login to view your portfolio.</div>;
  if (loading) return <div className="page-loading">Loading portfolio...</div>;

  if (error) return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
          <div style={{ color: neg, fontSize: "1.2rem", marginBottom: 16 }}>Error: {error}</div>
          <button onClick={loadAll} className="auth-button" style={{ maxWidth: 200, margin: "0 auto" }}>Retry</button>
      </div>
  );

  if (!data) return <div style={{ padding: "4rem", textAlign: "center" }}>No data available. Add stocks to your portfolio.</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem", color: "var(--text-primary)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700 }}>My Portfolio</h2>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Current Value</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>₹{data?.total_current?.toLocaleString() || "0"}</div>
        </div>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Return</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: (data?.total_pnl || 0) >= 0 ? pos : neg }}>
             {(data?.total_pnl || 0) >= 0 ? "+" : ""}₹{data?.total_pnl?.toLocaleString() || "0"}
          </div>
          <div style={{ fontSize: "0.9rem", color: (data?.total_pnl || 0) >= 0 ? pos : neg }}>{data?.total_pnl_pct?.toFixed(2) || "0.00"}%</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "24px", overflowX: "auto" }}>
        {["Dashboard", "Performance", "Analysis"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "0 4px 12px 4px", fontSize: "1rem", fontWeight: 600, color: activeTab === tab ? pos : "var(--text-secondary)",
                background: "transparent", border: "none", borderBottom: activeTab === tab ? `3px solid ${pos}` : "3px solid transparent", cursor: "pointer"
            }}>{tab}</button>
        ))}
      </div>

      {activeTab === "Dashboard" && (
          <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                      <tr style={{ background: "rgba(0,0,0,0.1)", borderBottom: "1px solid var(--border-subtle)" }}>
                          <th style={{ padding: 12, textAlign: "left" }}>Stock</th>
                          <th style={{ padding: 12, textAlign: "right" }}>Qty</th>
                          <th style={{ padding: 12, textAlign: "right" }}>LTP</th>
                          <th style={{ padding: 12, textAlign: "right" }}>Value</th>
                          <th style={{ padding: 12, textAlign: "right" }}>Returns</th>
                      </tr>
                  </thead>
                  <tbody>
                      {(data?.holdings || []).map(h => (
                          <tr key={h.symbol} style={{ borderBottom: "1px solid var(--border-faint)" }}>
                              <td style={{ padding: 12 }}>
                                  <div style={{ fontWeight: 700, cursor: "pointer" }} onClick={() => router.push(`/stock/${h.symbol}`)}>{h.symbol}</div>
                              </td>
                              <td style={{ padding: 12, textAlign: "right" }}>{h.qty}</td>
                              <td style={{ padding: 12, textAlign: "right" }}>₹{h.current_price?.toFixed(2) || "0.00"}</td>
                              <td style={{ padding: 12, textAlign: "right" }}>₹{h.current_value?.toLocaleString() || "0"}</td>
                              <td style={{ padding: 12, textAlign: "right", color: (h.pnl || 0) >= 0 ? pos : neg, fontWeight: 700 }}>{h.pnl_pct?.toFixed(2) || "0.00"}%</td>
                          </tr>
                      ))}
                      {(data?.holdings?.length === 0) && (
                          <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No stocks in portfolio yet.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === "Analysis" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div className="glass-card" style={{ height: 350, padding: 20, minWidth: 0, minHeight: 0 }}>
                  <h4 style={{ marginBottom: 12 }}>Sector Allocation</h4>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={data?.sector_data || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                              {(data?.sector_data || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="glass-card" style={{ height: 350, padding: 20, minWidth: 0, minHeight: 0 }}>
                  <h4 style={{ marginBottom: 12 }}>Portfolio vs Nifty 50</h4>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedHistory}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="portfolioPct" stroke={pos} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="benchmarkPct" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}
    </div>
  );
}
