"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Clock, BarChart2 } from "lucide-react";

export default function AssetTable({ assets, onSelect, type }) {
  const [activeTab, setActiveTab] = useState("price"); // price, performance, technical

  if (!assets || assets.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        No data available for {type}...
      </div>
    );
  }

  const renderHeader = () => {
    if (activeTab === "price") {
      return (
        <>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Last</th>
          <th style={thStyle}>High</th>
          <th style={thStyle}>Low</th>
          <th style={thStyle}>Chg.</th>
          <th style={thStyle}>Chg. %</th>
          <th style={thTextAlignRight}>Time</th>
        </>
      );
    }
    if (activeTab === "performance") {
      return (
        <>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Daily</th>
          <th style={thStyle}>1 Week</th>
          <th style={thStyle}>1 Month</th>
          <th style={thStyle}>YTD</th>
          <th style={thTextAlignRight}>Volatility</th>
        </>
      );
    }
    return ( // technical
      <>
        <th style={thStyle}>Name</th>
        <th style={thStyle}>52W High</th>
        <th style={thStyle}>52W Low</th>
        <th style={thTextAlignRight}>Sentiment</th>
      </>
    );
  };

  const renderRow = (asset) => {
    const isUp = asset.day_pct >= 0;
    const colorClass = isUp ? "up" : "down";
    
    if (activeTab === "price") {
      return (
        <tr key={asset.symbol} className="table-row-hover" onClick={() => onSelect(asset)} style={trStyle}>
          <td style={tdStyle}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{asset.name}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{asset.symbol}</div>
          </td>
          <td style={tdStyle} className="mono fw-600">
            {asset.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style={tdStyle} className="mono">{asset.high_52w?.toFixed(2) || "—"}</td>
          <td style={tdStyle} className="mono">{asset.low_52w?.toFixed(2) || "—"}</td>
          <td style={tdStyle} className={`mono ${colorClass}`}>
            {asset.day_change > 0 ? "+" : ""}{asset.day_change?.toFixed(2)}
          </td>
          <td style={tdStyle} className={`mono ${colorClass}`}>
            {asset.day_pct > 0 ? "+" : ""}{asset.day_pct?.toFixed(2)}%
          </td>
          <td style={tdTextAlignRight}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
               <Clock size={10} /> {new Date(asset.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </td>
        </tr>
      );
    }
    
    if (activeTab === "performance") {
        return (
          <tr key={asset.symbol} className="table-row-hover" onClick={() => onSelect(asset)} style={trStyle}>
            <td style={tdStyle}>
              <div style={{ fontWeight: 600 }}>{asset.name}</div>
            </td>
            <td style={tdStyle} className={asset.day_pct >= 0 ? "up" : "down"}>
                {asset.day_pct > 0 ? "+" : ""}{asset.day_pct?.toFixed(2)}%
            </td>
            <td style={tdStyle} className={asset.weekly_pct >= 0 ? "up" : "down"}>
                {asset.weekly_pct != null ? `${asset.weekly_pct > 0 ? "+" : ""}${asset.weekly_pct.toFixed(2)}%` : "—"}
            </td>
            <td style={tdStyle} className={asset.monthly_pct >= 0 ? "up" : "down"}>
                {asset.monthly_pct != null ? `${asset.monthly_pct > 0 ? "+" : ""}${asset.monthly_pct.toFixed(2)}%` : "—"}
            </td>
            <td style={tdStyle}>—</td>
            <td style={tdTextAlignRight}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Low</div>
            </td>
          </tr>
        );
    }

    // Technical
    return (
      <tr key={asset.symbol} className="table-row-hover" onClick={() => onSelect(asset)} style={trStyle}>
        <td style={tdStyle}>
          <div style={{ fontWeight: 600 }}>{asset.name}</div>
        </td>
        <td style={tdStyle} className="mono">{asset.high_52w?.toFixed(2) || "—"}</td>
        <td style={tdStyle} className="mono">{asset.low_52w?.toFixed(2) || "—"}</td>
        <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid var(--border-faint)" }}>
            <span style={{ 
                padding: "4px 8px", 
                borderRadius: "4px", 
                fontSize: "0.75rem", 
                fontWeight: "600",
                background: asset.sentiment > 0.65 ? "rgba(16, 185, 129, 0.15)" : asset.sentiment < 0.35 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                color: asset.sentiment > 0.65 ? "#10b981" : asset.sentiment < 0.35 ? "#ef4444" : "var(--text-secondary)",
                border: "1px solid " + (asset.sentiment > 0.65 ? "rgba(16, 185, 129, 0.3)" : asset.sentiment < 0.35 ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)")
            }}>
                {(asset.sentiment * 100).toFixed(0)}%
            </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="asset-table-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="asset-table-tabs" style={{ display: "flex", gap: "2px", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
        {["price", "performance", "technical"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 12px",
              background: activeTab === tab ? "rgba(255,255,255,0.08)" : "transparent",
              border: "none",
              borderRadius: "4px",
              color: activeTab === tab ? "var(--neon-cyan)" : "var(--text-secondary)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 10 }}>
            <tr>
              {renderHeader()}
            </tr>
          </thead>
          <tbody>
            {assets.map(renderRow)}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-row-hover {
            cursor: pointer;
            transition: background 0.2s;
        }
        .table-row-hover:hover {
            background: rgba(255, 255, 255, 0.03);
        }
        .mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }
        .up { color: var(--neon-green); }
        .down { color: var(--neon-red); }
      `}</style>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "0.7rem",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid var(--border-subtle)"
};

const thTextAlignRight = {
    ...thStyle,
    textAlign: "right"
};

const tdStyle = {
  padding: "12px",
  fontSize: "0.85rem",
  borderBottom: "1px solid var(--border-faint)"
};

const tdTextAlignRight = {
    ...tdStyle,
    textAlign: "right"
};

const trStyle = {
    transition: "background 0.2s"
};
