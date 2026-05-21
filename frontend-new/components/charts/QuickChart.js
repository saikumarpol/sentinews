"use client";

import dynamic from "next/dynamic";
import React from "react";

const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const ReferenceLine = dynamic(() => import("recharts").then((mod) => mod.ReferenceLine), { ssr: false });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1e293b", borderRadius: 8, padding: "8px 12px",
      fontSize: "0.8rem", color: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
    }}>
      <div style={{ color: "#94a3b8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>₹{payload[0].value?.toFixed(2)}</div>
    </div>
  );
}

export default function QuickChart({ data, color, ma50Value }) {
  if (!data || data.length === 0) return <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>No data...</div>;

  return (
    <div style={{ height: 500, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" hide />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={60} tickFormatter={v => `₹${v}`} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#cg)" dot={false} />
          {ma50Value && (
            <ReferenceLine y={ma50Value} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "MA50", fontSize: 10, fill: "#f59e0b" }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
