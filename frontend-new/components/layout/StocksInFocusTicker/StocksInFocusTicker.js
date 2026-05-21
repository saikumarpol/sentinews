"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchStocksInFocus } from "@/lib/api";
import "./StocksInFocusTicker.css";

function fmt(val) {
  if (val == null) return "—";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function TickerItem({ item, prevPrice }) {
  const [flash, setFlash] = useState("");
  const price = item.last_price;

  useEffect(() => {
    if (prevPrice == null || price == null || prevPrice === price) return;
    const cls = price > prevPrice ? "stock-flash-up" : "stock-flash-down";
    setFlash(cls);
    const t = setTimeout(() => setFlash(""), 700);
    return () => clearTimeout(t);
  }, [price, prevPrice]);

  const pct = item.change_pct;
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "●";

  return (
    <div className={`stock-ticker-item ${flash}`}>
      <span className="stock-ticker-item__name">{item.symbol}</span>
      <span className="stock-ticker-item__price">₹{fmt(price)}</span>
      {pct != null && (
        <span className={`stock-ticker-item__change ${dir}`}>
          {arrow} {Math.abs(pct).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function StocksInFocusTicker() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevPrices = useRef({});

  const load = async () => {
    try {
      const data = await fetchStocksInFocus();
      const items = data.stocks || [];
      
      const prev = {};
      stocks.forEach((s) => { prev[s.symbol] = s.last_price; });
      prevPrices.current = prev;

      setStocks(items);
    } catch (err) {
      console.error("Focus stocks fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 5 minutes (300,000 ms) as requested
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, []);

  if (loading && stocks.length === 0) return null;
  if (stocks.length === 0) return null;

  return (
    <div className="stocks-focus-ticker">
      <div className="stocks-focus-ticker__label">STOCKS IN FOCUS</div>
      <div className="stocks-focus-ticker__track">
        <div className="stocks-focus-ticker__scroll">
          {[...stocks, ...stocks].map((item, i) => (
            <TickerItem
              key={`${item.symbol}-${i}`}
              item={item}
              prevPrice={prevPrices.current[item.symbol]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
