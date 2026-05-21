"use client";

import React, { useEffect, useState } from "react";
import { fetchPreMarketReport, fetchPostMarketReport } from "@/lib/api";
import "./MarketReportsPage.css";

function getISTHour() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 3600 * 1000;
  return new Date(istMs).getHours() + new Date(istMs).getMinutes() / 60;
}

function getReportMode() {
  const h = getISTHour();
  // 4:00 AM to 9:15 AM -> Pre-Market
  if (h >= 4 && h < 9.25) return "pre";
  // 9:15 AM to 3:30 PM (15.5) -> Post-Market (Live Digest)
  // After 3:30 PM -> Post-Market (Final Digest)
  return "post"; 
}

function SectionBlock({ title, icon, children }) {
  return (
    <section className="report-section">
      <div className="report-section__header">
        <span className="report-section__icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="report-section__body">{children}</div>
    </section>
  );
}

function IndexCard({ name, value, change_pct }) {
  const dir = change_pct > 0 ? "up" : change_pct < 0 ? "down" : "flat";
  // Fix: If value is 0 or null, show "—" instead of "0" for global indices to avoid confusion
  const priceStr = (value && value !== 0) ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
  return (
    <div className={`report-index-card report-index-card--${dir}`}>
      <div className="ric__name">{name}</div>
      <div className="ric__price">{priceStr}</div>
      <div className={`ric__change ric__change--${dir}`}>
        {(change_pct != null && change_pct !== 0) ? (
          <>
            {change_pct > 0 ? "▲" : "▼"} {Math.abs(change_pct).toFixed(2)}%
          </>
        ) : "—"}
      </div>
    </div>
  );
}

function StockTable({ rows, type }) {
  const isGainer = type === "gainers";
  return (
    <table className="report-table">
      <thead>
        <tr><th>Symbol</th><th>Price</th><th>Change %</th></tr>
      </thead>
      <tbody>
        {rows?.slice(0, 5).map((r, i) => (
          <tr key={i}>
            <td className="report-table__symbol">{r.symbol}</td>
            <td>₹{r.last_price?.toLocaleString()}</td>
            <td className={isGainer ? "up" : "down"}>{isGainer ? "▲" : "▼"} {Math.abs(r.change_pct).toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MarketReportsPage() {
  const mode = getReportMode();
  const [activeMode, setActiveMode] = useState(mode);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const fetcher = activeMode === "pre" ? fetchPreMarketReport : fetchPostMarketReport;
      const res = await fetcher();
      setData(res);
    } catch (e) {
      if (!isBackground) setError(e.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(() => loadData(true), 300000);
    return () => clearInterval(interval);
  }, [activeMode]);

  if (loading) return <div className="page-loading">Generating Intelligence Report...</div>;

  return (
    <div className="reports-page">
      <div className="reports-page__header">
        <div>
          <h2>Market Reports</h2>
          <p>Daily briefing & digest powered by AI</p>
        </div>
        <div className="reports-toggle">
          <button className={`toggle-btn ${activeMode === "pre" ? "active" : ""}`} onClick={() => setActiveMode("pre")}>🌅 Pre-Market</button>
          <button className={`toggle-btn ${activeMode === "post" ? "active" : ""}`} onClick={() => setActiveMode("post")}>🌆 Post-Market</button>
        </div>
      </div>

      <div className="report-doc">
        <div className="report-doc__header">
            <div className="report-doc__header-main">
              <div className="report-doc__badge">{activeMode.toUpperCase()}</div>
              <h1>
                {activeMode === "pre" 
                  ? "Pre-Market Briefing" 
                  : getISTHour() < 15.5 && activeMode === "post"
                    ? "Live Market Digest" 
                    : "Post-Market Digest"}
              </h1>
            </div>
            {data?.generated_at && (
              <div className="report-doc__timestamp">
                <span className="timestamp-label">Last Updated:</span>
                <span className="timestamp-value">
                  {new Date(data.generated_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            )}
        </div>

        {data?.indices ? (
          <SectionBlock title="Indian Indices" icon="🇮🇳">
            <div className="report-indices-grid">
              {data.indices.filter(i => i.region === "indian").map(idx => (
                <IndexCard key={idx.name} {...idx} value={idx.last_price} change_pct={idx.change_pct} />
              ))}
              {data.indices.filter(i => i.region === "indian").length === 0 && <div className="report-text">Market data currently unavailable.</div>}
            </div>
          </SectionBlock>
        ) : null}

        <div className="report-ad-placeholder">Advertisement</div>

        {data?.indices ? (
          <SectionBlock title="Global Indices & Futures" icon="🌎">
            <div className="report-indices-grid">
              {data.indices.filter(i => i.region !== "indian").map(idx => (
                <IndexCard key={idx.name} {...idx} value={idx.last_price} change_pct={idx.change_pct} />
              ))}
              {data.indices.filter(i => i.region !== "indian").length === 0 && <div className="report-text">Market data currently unavailable.</div>}
            </div>
          </SectionBlock>
        ) : null}

        {data?.currencies && data.currencies.length > 0 && (
          <SectionBlock title="Currencies" icon="💱">
            <div className="report-indices-grid">
              {data.currencies.map(idx => <IndexCard key={idx.name} {...idx} value={idx.price} change_pct={idx.day_pct} />)}
            </div>
          </SectionBlock>
        )}

        <SectionBlock title="FII / DII Activity" icon="🏦">
          {data?.fii_dii ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="report-index-card">
                  <div className="ric__name">FII Net (₹ Cr)</div>
                  <div className={`ric__price ${data.fii_dii.fii?.net >= 0 ? "up" : "down"}`}>
                    {data.fii_dii.fii?.net?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="report-index-card">
                  <div className="ric__name">DII Net (₹ Cr)</div>
                  <div className={`ric__price ${data.fii_dii.dii?.net >= 0 ? "up" : "down"}`}>
                    {data.fii_dii.dii?.net?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
              <p className="rni-source" style={{marginTop: "10px"}}>Data as of {data.fii_dii.date}</p>
            </>
          ) : (
            <p className="report-text">FII/DII data currently unavailable (likely weekend or after-hours delay).</p>
          )}
        </SectionBlock>

        {data?.commodities && data.commodities.length > 0 && (
          <SectionBlock title="Commodities Snapshot" icon="🛢️">
            <div className="report-indices-grid">
              {data.commodities.map(idx => <IndexCard key={idx.name} {...idx} value={idx.price} change_pct={idx.day_pct} />)}
            </div>
          </SectionBlock>
        )}

        {activeMode === "pre" && (
          <SectionBlock title="Pre-Market Indian ADRs" icon="🇺🇸">
            <div className="report-indices-grid">
              {data?.adrs && data.adrs.length > 0 ? (
                data.adrs.map(idx => <IndexCard key={idx.name} {...idx} value={idx.last_price} change_pct={idx.change_pct} />)
              ) : (
                <div className="report-text">ADR market data unavailable at this time.</div>
              )}
            </div>
          </SectionBlock>
        )}
        
        {(data?.geopolitical_news?.length > 0 || data?.indian_news?.length > 0 || data?.stocks_in_news?.length > 0) && (
          <SectionBlock title="Market & Stocks News" icon="📈">
            <ul className="report-news-list">
              {[...(data?.geopolitical_news || []), ...(data?.indian_news || [])].map((item, i) => (
                <li key={`macro-${i}`} className="report-news-item">
                  <div className="rni-bullet"></div>
                  <div className="rni-content">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="rni-text" style={{textDecoration: "none"}}>
                      {item.headline}
                    </a>
                    {item.source && <span className="rni-source">Source: {item.source}</span>}
                  </div>
                </li>
              ))}
              {(data?.stocks_in_news || []).map((item, i) => (
                <li key={`stock-${i}`} className="report-news-item">
                  <div className="rni-bullet"></div>
                  <div className="rni-content">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="rni-text" style={{textDecoration: "none"}}>
                      <span className="rni-company">{item.company}</span>
                      {item.news}
                    </a>
                    {item.source && (
                      <span className="rni-source">Source: {item.source}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionBlock>
        )}

        <div className="report-ad-placeholder">Advertisement</div>
        
        {data?.events && data.events.length > 0 && (
          <SectionBlock title="Key Corporate Events" icon="📅">
            <table className="report-table">
              <thead>
                <tr><th>Company</th><th>Purpose</th><th>Date</th></tr>
              </thead>
              <tbody>
                {data.events.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="report-table__symbol">{r.company}</td>
                    <td>{r.purpose}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionBlock>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <SectionBlock title="Gainers" icon="🚀"><StockTable rows={data?.gainers} type="gainers" /></SectionBlock>
            <SectionBlock title="Losers" icon="📉"><StockTable rows={data?.losers} type="losers" /></SectionBlock>
        </div>

        {data?.ai_outlook && (
          <div className="report-ai-outlook">
            <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>🤖 AI Market Outlook</div>
            <p>{data.ai_outlook}</p>
          </div>
        )}

        <div className="report-disclaimer">
          <strong>Disclaimer:</strong> All data, news, and analysis provided in this report are strictly for educational and informational purposes only. Sentinews does not provide financial tips, trading suggestions, or investment advice. Market data may be delayed or inaccurate. Please consult a registered financial advisor before making any investment decisions.
        </div>
      </div>
    </div>
  );
}
