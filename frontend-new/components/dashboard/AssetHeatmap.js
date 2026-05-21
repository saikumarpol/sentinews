"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

const getHeatClass = (pct) => {
  if (pct >= 3) return "heat-plus-3";
  if (pct >= 1.5) return "heat-plus-2";
  if (pct >= 0.5) return "heat-plus-1";
  if (pct <= -3) return "heat-minus-3";
  if (pct <= -1.5) return "heat-minus-2";
  if (pct <= -0.5) return "heat-minus-1";
  return "heat-neutral";
};

const getSentimentColor = (action) => {
  if (action === "BULLISH") return "#10b981";
  if (action === "BEARISH") return "#ef4444";
  return "rgba(255,255,255,0.4)";
};

export default function AssetHeatmap({ data, type = "all", filter = "", onSelect }) {
  const filteredAssets = useMemo(() => {
    if (!data) return [];
    
    let assets = [];
    if (type === "commodities" || type === "all") {
      assets = [...assets, ...data.commodities.map(c => ({ ...c, kind: "COMM" }))];
    }
    if (type === "currencies" || type === "all") {
      assets = [...assets, ...data.currencies.map(c => ({ ...c, kind: "FOREX" }))];
    }
    if (type === "indices" || type === "all") {
      assets = [...assets, ...data.indices.map(i => ({ ...i, kind: "INDEX" }))];
    }

    return assets.filter(a => 
      a.name.toLowerCase().includes(filter.toLowerCase()) || 
      a.symbol.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, type, filter]);

  if (filteredAssets.length === 0) {
    return <div className="report-text" style={{ padding: "1rem", fontSize: "0.75rem" }}>No data available for {type}...</div>;
  }

  return (
    <div className="heatmap-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
      {filteredAssets.map((asset) => {
        const pct = asset.day_pct || 0;
        const heatClass = getHeatClass(pct);
        
        return (
          <div 
            key={asset.symbol} 
            className={clsx("heatmap-card", heatClass)}
            onClick={() => onSelect && onSelect(asset)}
            style={{ cursor: "pointer" }}
          >
            <div className="heatmap-card__top">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="heatmap-card__symbol">{asset.kind}</div>
                {asset.action && asset.action !== "NEUTRAL" && (
                  <div style={{ 
                    fontSize: "0.5rem", padding: "1px 4px", borderRadius: "2px", 
                    background: "rgba(0,0,0,0.5)", color: getSentimentColor(asset.action),
                    fontWeight: 800, border: `1px solid ${getSentimentColor(asset.action)}`
                  }}>
                    {asset.action}
                  </div>
                )}
              </div>
              <div className="heatmap-card__name">{asset.name}</div>
            </div>
            
            <div className="heatmap-card__value">
              <div className="heatmap-card__price">
                {asset.price !== 0 ? asset.price.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
              </div>
              <div className="heatmap-card__pct">
                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
