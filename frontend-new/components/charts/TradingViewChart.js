"use client";

import dynamic from "next/dynamic";

const AdvancedRealTimeChart = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false, loading: () => <div style={{ height: 500, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Pro Terminal...</div> }
);

export default function TradingViewChart({ symbol, exchange }) {
  const tvSymbol = exchange === "NSE" ? `NSE:${symbol.split(".")[0]}` : symbol;

  return (
    <div style={{ height: 500, width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      <AdvancedRealTimeChart
        symbol={tvSymbol}
        theme="light"
        width="100%"
        height={500}
        autosize={false}
        timezone="Asia/Kolkata"
        studies={["RSI@tv-basicstudies", "MACD@tv-basicstudies", "Volume@tv-basicstudies"]}
      />
    </div>
  );
}
