"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MoversScanner({ gainers, losers }) {
  return (
    <div style={{ padding: "4px", height: "100%", overflowY: "auto" }}>
      <table className="movers-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th style={{ textAlign: "right" }}>Last</th>
            <th style={{ textAlign: "right" }}>Chg %</th>
          </tr>
        </thead>
        <tbody>
          {gainers?.slice(0, 10).map((g, i) => (
            <tr key={`g-${i}`}>
              <td style={{ color: "#fff", fontWeight: 700 }}>{g.symbol}</td>
              <td style={{ textAlign: "right" }}>{g.last_price?.toLocaleString()}</td>
              <td style={{ textAlign: "right", color: "#00FF33", fontWeight: 700 }}>+{g.change_pct?.toFixed(2)}%</td>
            </tr>
          ))}
          <tr style={{ height: "4px" }}></tr>
          {losers?.slice(0, 10).map((l, i) => (
            <tr key={`l-${i}`}>
              <td style={{ color: "#fff", fontWeight: 700 }}>{l.symbol}</td>
              <td style={{ textAlign: "right" }}>{l.last_price?.toLocaleString()}</td>
              <td style={{ textAlign: "right", color: "#FF3333", fontWeight: 700 }}>{l.change_pct?.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
