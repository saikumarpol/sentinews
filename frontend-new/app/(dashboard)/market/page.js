"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMarketFeed, fetchEvents } from "@/lib/api";
import GainersLosers from "@/components/market/GainersLosers/GainersLosers";
import './MarketFeed.css';

function TickerTape({ items }) {
  if (!items || items.length === 0) return null;
  const scrollItems = [...items, ...items, ...items];
  return (
    <div className="ticker-tape ticker-tape--news">
      <div className="ticker-tape__scroll">
        {scrollItems.map((item, i) => (
          <span key={i} className="ticker-tape__item">
            <span className="ticker-tape__headline">🚨 {item.headline}</span>
            <span className="ticker-tape__sep">━━━</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SentimentGauge({ sentiment }) {
  if (!sentiment) return null;
  const percentage = Math.round(sentiment.score * 100);

  let strokeColor = "#9ca3af";
  if (sentiment.score >= 0.55) strokeColor = "#10b981";
  else if (sentiment.score <= 0.45) strokeColor = "#ef4444";
  else strokeColor = "#f59e0b";

  return (
    <div className="sentiment-gauge">
      <div
        className="gauge-circle"
        style={{
          background: `conic-gradient(${strokeColor} ${percentage}%, rgba(255,255,255,0.05) ${percentage}%)`
        }}
      >
        <div className="gauge-inner">
          <span className="gauge-value">{percentage}%</span>
          <span className="gauge-label">BULLISH</span>
        </div>
      </div>
      <div className="gauge-text">
        <strong>Market Sentiment</strong>
        <span style={{ color: strokeColor }}>{sentiment.label}</span>
      </div>
    </div>
  );
}

function NewsCard({ item, highlight, onViewStock }) {
  const sentimentColor =
    item.sentiment > 0.2
      ? "#16a34a"
      : item.sentiment < -0.2
        ? "#dc2626"
        : "#9ca3af";

  const time = item.published_at
    ? new Date(item.published_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

  return (
    <article className={`news-card ${highlight ? "news-card--highlight" : ""}`}>
      <div className="news-card__glow" />
      <div className="news-card__content">
        <div className="news-meta">
          <span className="source">{item.source}</span>
          {time && <span className="time">{time}</span>}
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="headline-link"
        >
          <h3>{item.headline}</h3>
        </a>

        {item.summary && (
          <p className="summary">
            {item.summary.length > 220
              ? item.summary.slice(0, 220) + "…"
              : item.summary}
          </p>
        )}

        {item.tickers && item.tickers.length > 0 && (
          <div className="tickers">
            {item.tickers.map((t) => (
              <span
                key={t}
                className="ticker-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStock?.(t);
                }}
                style={{ cursor: "pointer" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="news-footer">
          <div className="sentiment" style={{ color: sentimentColor }}>
            <span className="sentiment-dot" />
            Sentiment: {item.sentiment.toFixed(2)} ({item.action})
          </div>
          <button
            className="read-btn"
            onClick={() => {
              if (item.url) window.open(item.url, "_blank", "noreferrer");
            }}
          >
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MarketFeedPage() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFiiDii, setShowFiiDii] = useState(false);
  const [events, setEvents] = useState([]);

  const router = useRouter();

  const handleViewStock = (symbol) => {
    router.push(`/stock/${symbol}`);
  };

  const navigateCommodities = () => {
    router.push("/commodities");
  };

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const fd = await fetchMarketFeed();
      setFeed(fd || null);
      const ev = await fetchEvents();
      setEvents(ev?.events || []);
    } catch (e) {
      if (!isBackground) setError(e.message || "Error feed");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !feed)
    return <div className="page-loading">Loading market feed...</div>;
  if (error && !feed) return <div className="page-error">Error: {error}</div>;
  if (!feed) return <div className="page-error">No data</div>;

  const news = feed.headline_news || [];
  const fiiDii = feed.fii_dii;
  const overallSentiment = feed.overall_sentiment;
  const topHeadlines = news.slice(0, 3);
  const rest = news.slice(3);

  return (
    <div className="market-feed-page">
      <TickerTape items={news.slice(0, 8)} />

      <div className="market-hero">
        <div className="market-hero-content">
          <h1>Market Pulse</h1>
          <p>Live headlines, sentiment signals and trends, constantly updating.</p>

          <div className="hero-buttons">
            <button
              className="read-btn"
              style={{ marginTop: "0.75rem", marginRight: "0.75rem" }}
              onClick={() => setShowFiiDii((v) => !v)}
            >
              {showFiiDii ? "Hide FII / DII Data" : "View FII / DII Data"}
            </button>


          </div>
        </div>

        <div className="hero-right">
          <SentimentGauge sentiment={overallSentiment} />
          <div className="ad-box-mini">
            <span>Market Sponsor</span>
          </div>
        </div>
      </div>

      {showFiiDii && fiiDii && (
        <section className="section-block">
          <div className="section-header">
            <h2>Institutional Activity (FII / DII)</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="section-subtitle">
                Net flows in cash segment (₹ crore)
              </span>
            </div>
          </div>
          <div className="news-grid">
            <div className="news-card news-card--highlight">
              <div className="news-card__glow" />
              <div className="news-card__content">
                <div className="news-meta">
                  <span className="source">Institutions</span>
                  <span className="time">{fiiDii.date}</span>
                </div>
                <h3>FII vs DII Flows</h3>
                <p className="summary">
                  FII Net: {fiiDii.fii.net.toFixed(2)} Cr, DII Net:{" "}
                  {fiiDii.dii.net.toFixed(2)} Cr
                </p>
                <div className="tickers">
                  <span className="ticker-chip">FII Buy: {fiiDii.fii.buy.toFixed(2)}</span>
                  <span className="ticker-chip">FII Sell: {fiiDii.fii.sell.toFixed(2)}</span>
                  <span className="ticker-chip">DII Buy: {fiiDii.dii.buy.toFixed(2)}</span>
                  <span className="ticker-chip">DII Sell: {fiiDii.dii.sell.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-header">
          <h2>Today's Movers</h2>
          <span className="section-subtitle">NSE live — top gainers &amp; losers</span>
        </div>
        <GainersLosers />
      </section>

      <div className="ad-strip ad-strip--premium">
        <div className="ad-slot ad-slot--half">
          <span>Premium Strategy Ad</span>
        </div>
        <div className="ad-slot ad-slot--half">
          <span>Brokerage Partner Ad</span>
        </div>
      </div>

      {events && events.length > 0 && (
        <section className="section-block events-widget">
          <div className="section-header">
            <h2>📅 Corporate Events</h2>
            <span className="section-subtitle">Upcoming Earnings, Dividends, & Meetings</span>
          </div>
          <div className="events-scroll-container">
            {events.slice(0, 15).map((ev, i) => (
              <div key={i} className="event-card">
                <div className="event-date">
                  <span className="ev-day">{ev.date.split('-')[0]}</span>
                  <span className="ev-month">{ev.date.split('-')[1]}</span>
                </div>
                <div className="event-details">
                  <span className="ev-symbol" onClick={() => handleViewStock(ev.symbol)}>{ev.symbol}</span>
                  <span className="ev-purpose">{ev.purpose.length > 40 ? ev.purpose.slice(0, 40) + '...' : ev.purpose}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-header">
          <h2>Top Headlines</h2>
        </div>
        <div className="news-grid news-grid--top">
          {topHeadlines.map((item, idx) => (
            <NewsCard key={item.id || idx} item={item} highlight onViewStock={handleViewStock} />
          ))}
        </div>
      </section>

      <div className="ad-strip">
        <div className="ad-slot ad-slot--wide">
          <span>Wide banner ad</span>
        </div>
      </div>

      <section className="section-block">
        <div className="section-header">
          <h2>All Trending News</h2>
          <span className="section-subtitle">
            Sorted by relevance and recent sentiment
          </span>
        </div>
        <div className="news-grid">
          {rest.map((item, idx) => (
            <NewsCard key={item.id || idx} item={item} onViewStock={handleViewStock} />
          ))}
        </div>
      </section>
    </div>
  );
}
