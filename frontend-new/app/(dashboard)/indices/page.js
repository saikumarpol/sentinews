"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchIndicesDashboard } from "@/lib/api";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { Clock, RefreshCw, Activity } from "lucide-react";
import "../commodities/CommoditiesDashboard.css";

export default function IndicesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFutures, setIsFutures] = useState(false);

  const loadData = useCallback(async (isSilent = false, futuresMode = isFutures) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetchIndicesDashboard(futuresMode);
      setData(res);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load market data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isFutures]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000); // 1 min
    return () => clearInterval(interval);
  }, [loadData, isFutures]);

  const toggleFutures = () => {
    const next = !isFutures;
    setIsFutures(next);
    loadData(false, next);
  };

  if (loading) return (
    <div className="page-loading">
      <div className="loader-spinner"></div>
      Syncing Global Indices Terminal...
    </div>
  );
  
  if (error && !data) return <div className="page-error">Error: {error}</div>;

  return (
    <div className="commodities-container">
      <div className="dashboard-header">
        <div className="header-title">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity className="accent" size={24} />
            <h1>Global Indices</h1>
          </div>
          <p style={{ color: "var(--text-secondary)" }}>
            Real-time Equity Benchmarks & Multi-Exchange Analytics
          </p>
        </div>
        
        <div className="header-controls" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button 
            className={`futures-toggle-btn ${isFutures ? 'active' : ''}`}
            onClick={toggleFutures}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600",
              background: isFutures ? "var(--neon-teal)" : "rgba(255,255,255,0.05)",
              color: isFutures ? "black" : "white",
              border: isFutures ? "none" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {isFutures ? "📊 Viewing Futures" : "📈 Switch to Futures"}
          </button>
          
          <div className="last-updated">
            <Clock size={14} />
            {data?.snapshot?.date ? (
              new Date(data.snapshot.date).toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
              })
            ) : "—"}
          </div>
          <button 
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => loadData(true)}
            style={{ 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white"
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <DashboardGrid data={data} type="indices" />
      
      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "1rem", textAlign: "center" }}>
          Reconnecting to data stream... ({error})
        </div>
      )}
    </div>
  );
}
