"use client";
// Bloomberg-lite Terminal Fixed

import React, { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Maximize2, Move, BarChart3, PieChart, Newspaper, BellRing, Calendar, TrendingUp, Activity, X } from "lucide-react";
import AssetTable from "./AssetTable";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetWrapper = ({ title, icon: Icon, children, id, showDragHandle }) => (
  <div className="grid-item-container" id={id}>
    <div className="widget-header">
      <div className="widget-title">
        <Icon size={12} />
        {title}
      </div>
      {showDragHandle && (
        <div className="widget-actions">
          <Move size={12} className="drag-handle" style={{ cursor: "move", opacity: 0.6 }} />
        </div>
      )}
    </div>
    <div className="widget-content" style={{ height: "calc(100% - 24px)" }}>
      {children}
    </div>
  </div>
);

export default function DashboardGrid({ data, type = "commodities" }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [layout, setLayout] = useState([
    { i: "assets", x: 0, y: 0, w: 6, h: 10 },
    { i: "news", x: 6, y: 0, w: 6, h: 10 },
  ]);
  const [showChart, setShowChart] = useState(false);
  const [chartPos, setChartPos] = useState({ x: 300, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const onLayoutChange = (newLayout) => {
    // Layout is static
  };

  const handleAssetSelect = (asset) => {
    let tvSymbol = asset.symbol;
    
    // Robust mapping based on type or asset properties
    if (type === "commodities" || asset.kind === "COMM" || asset.category === "Commodity") {
      const commMap = {
        "GC=F": "TVC:GOLD", 
        "CL=F": "TVC:USOIL", 
        "SI=F": "TVC:SILVER", 
        "HG=F": "TVC:COPPER",
        "NG=F": "TVC:NATURALGAS", 
        "PL=F": "TVC:PLATINUM", 
        "PA=F": "TVC:PALLADIUM", 
        "RB=F": "TVC:USRB",
        "ZN=F": "TVC:ZINC",
        "PB=F": "TVC:LEAD",
        "NI=F": "TVC:NICKEL",
        "SRU=F": "TVC:RUBBER",
        "GJS=F": "NCDEX:GUARSEED101!",
        "MENTHA-F": "MCX:MENTHAOIL1!",
        "KAPAS.NS": "NCDEX:KAPAS1!",
        "GOLDPETAL": "MCX:GOLDPETAL1!",
      };
      tvSymbol = commMap[asset.symbol] || asset.symbol;
    } else if (type === "currencies" || asset.kind === "FX" || asset.category === "Currencies") {
      const curMap = {
        "USDINR=F": "FX_IDC:USDINR",
        "EURUSD=F": "FX:EURUSD",
        "GBPUSD=F": "FX:GBPUSD",
        "JPY=F": "FX:USDJPY",
        "AUD=F": "FX:AUDUSD",
        "CAD=F": "FX:USDCAD",
      };
      tvSymbol = curMap[asset.symbol] || asset.symbol;
    } else if (type === "indices" || asset.kind === "INDEX" || asset.category === "Indices") {
      const indexMap = {
        "^NSEI": "TVC:NIFTY", 
        "^BSESN": "TVC:SENSEX", 
        "^NSEBANK": "TVC:BANKNIFTY", 
        "^CNXIT": "NSE:NIFTYIT",
        "^GSPC": "CAPITALCOM:US500", 
        "^DJI": "CAPITALCOM:US30", 
        "^IXIC": "CAPITALCOM:US100", 
        "^NDX": "CAPITALCOM:US100",
        "^FTSE": "CAPITALCOM:UK100", 
        "^N225": "CAPITALCOM:JP225", 
        "^HSI": "CAPITALCOM:HK33",
        "^GDAXI": "CAPITALCOM:DE40",
        "^FCHI": "CAPITALCOM:FRA40",
        "^IBEX": "TVC:IBEX35",
        "^FTSEA50": "CAPITALCOM:CN50",
        "URTH": "AMEX:URTH",
        "NIFTY_F1.NS": "TVC:NIFTY",
        "BANKNIFTY_F1.NS": "TVC:BANKNIFTY",
        "ES=F": "CAPITALCOM:US500",
        "NQ=F": "CAPITALCOM:US100",
        "YM=F": "CAPITALCOM:US30",
        "^VIX": "TVC:VIX",
      };
      tvSymbol = indexMap[asset.symbol] || asset.symbol;
    } else if (type === "currencies" || asset.kind === "FOREX" || asset.category === "Currencies") {
      const forexMap = {
        "USDINR=X": "FX_IDC:USDINR", 
        "EURUSD=X": "FX:EURUSD", 
        "GBPUSD=X": "FX:GBPUSD", 
        "USDJPY=X": "FX:USDJPY",
        "EURCHF=X": "FX:EURCHF",
        "EURINR=X": "FX_IDC:EURINR", 
        "GBPINR=X": "FX_IDC:GBPINR", 
        "AUDUSD=X": "FX:AUDUSD",
        "USDCAD=X": "FX:USDCAD",
        "USDCHF=X": "FX:USDCHF", 
        "NZDUSD=X": "FX:NZDUSD",
        "GBPEUR=X": "FX:GBPEUR",
        "EURCHF=X": "FX:EURCHF",
      };
      tvSymbol = forexMap[asset.symbol] || asset.symbol.replace("=X", "");
    }
    setSelectedAsset({ ...asset, tvSymbol });
    setShowChart(true);
  };

  // Filter assets based on type
  const filteredAssets = React.useMemo(() => {
    if (!data?.snapshot) return [];
    if (type === "commodities") return data.snapshot.commodities || [];
    if (type === "indices") return data.snapshot.indices || [];
    if (type === "currencies") return data.snapshot.currencies || [];
    return [];
  }, [data, type]);

  // Floating Chart Drag Logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - chartPos.x,
      y: e.clientY - chartPos.y
    });
  };

  const handleMouseMove = React.useCallback((e) => {
    if (isDragging) {
      setChartPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  // News to Chart Link logic
  const handleNewsClick = (e, item) => {
    e.preventDefault();
    // Search for matching asset in our current view
    const match = filteredAssets.find(asset => 
      item.headline.toLowerCase().includes(asset.name.toLowerCase()) ||
      (asset.symbol && item.headline.toLowerCase().includes(asset.symbol.toLowerCase().replace("=F", "").replace("^", "").replace("=X", "")))
    );
    
    if (match) {
      handleAssetSelect(match);
    } else {
      // If no asset match, open URL
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const pageTitle = type === "commodities" ? "Commodities" : type === "indices" ? "Global Indices" : "Currencies";
  const PageIcon = type === "commodities" ? BarChart3 : type === "indices" ? Activity : TrendingUp;

  return (
    <>
      <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xss: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xss: 2 }}
      rowHeight={80}
      draggableHandle=".drag-handle"
      onLayoutChange={onLayoutChange}
      margin={[6, 6]}
    >
      <div key="assets">
        <WidgetWrapper title={pageTitle} icon={PageIcon}>
          <AssetTable assets={filteredAssets} type={type} onSelect={handleAssetSelect} />
        </WidgetWrapper>
      </div>

      <div key="news">
        <WidgetWrapper title="Bloomberg Intelligence" icon={Newspaper}>
          <div className="news-terminal-list">
            {(data?.news || []).map((item, idx) => (
              <div key={idx} className="news-terminal-item">
                <div className={`news-impact-indicator impact-${item.impact || 'low'}`}></div>
                <div style={{ flex: 1 }}>
                  <a 
                    href={item.url} 
                    onClick={(e) => handleNewsClick(e, item)}
                    className="news-headline-terminal"
                    style={{ cursor: "pointer" }}
                  >
                    {item.headline}
                  </a>
                  <div className="news-meta">
                    {item.source} • {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </WidgetWrapper>
      </div>

      </ResponsiveGridLayout>

      {/* Floating Interactive Chart */}
      {showChart && selectedAsset && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} onClick={() => setShowChart(false)}>
          <div 
            style={{
              position: "absolute",
              left: `${chartPos.x}px`,
              top: `${chartPos.y}px`,
              width: "700px",
              height: "600px",
              backgroundColor: "#0a0a0a",
              border: "1px solid var(--border-main)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              borderRadius: "4px",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{
                padding: "8px 12px",
                backgroundColor: "#151515",
                borderBottom: "1px solid var(--border-faint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "move"
              }}
              onMouseDown={handleMouseDown}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: "600", color: "var(--brand-primary)" }}>
                <Activity size={14} />
                {selectedAsset.name} Terminal Analysis
              </div>
              <button 
                onClick={() => setShowChart(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ flex: 1, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <AdvancedRealTimeChart 
                  key={selectedAsset.tvSymbol}
                  symbol={selectedAsset.tvSymbol}
                  theme="dark"
                  autosize
                  timezone="Asia/Kolkata"
                  style="1"
                  locale="en"
                  enable_publishing={false}
                  hide_top_toolbar={false}
                  save_image={true}
                  allow_symbol_change={true}
                  details={true}
                  withdateranges={true}
                  container_id={`tv_chart_popup_${selectedAsset.symbol.replace(/[^a-zA-Z0-9]/g, '_')}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
