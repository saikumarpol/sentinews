"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchDailyNewsData } from '@/lib/api';

// Simple fallback components to avoid missing dependency errors
const Card = ({ children, className }) => <div className={className}>{children}</div>;
const Button = ({ children, className, onClick, disabled, type="button" }) => (
  <button type={type} className={`px-4 py-2 rounded-md font-medium transition-colors ${className}`} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

export default function DailyStockNewsPage() {
  const [date, setDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDailyNews = async (selectedDate) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyNewsData(selectedDate);
      setNews(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load daily stock news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyNews(date);
  }, [date]);

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  // Format the date for the header display
  const displayDate = new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="stocks-news-container">
      <header className="page-header">
        <div className="header-content">
          <h1 className="title-gradient">📈 Stocks In News</h1>
          <p className="subtitle">
            Curated corporate buzz for <span className="highlight-date">{displayDate}</span>. Catch the catalysts before they move the market.
          </p>
        </div>
        
        <div className="controls">
          <div className="date-picker-wrapper">
            <span className="icon">📅</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="custom-date-input"
            />
          </div>
          <Button 
            onClick={() => fetchDailyNews(date)}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? '🔄 Updating...' : '🔄 Refresh Data'}
          </Button>
        </div>
      </header>

      <Card className="news-main-card">
        {loading ? (
          <div className="loader-container">
            <div className="premium-spinner"></div>
            <p>Scanning markets for {displayDate}...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>System Error</h3>
            <p>{error}</p>
            <Button onClick={() => fetchDailyNews(date)} className="retry-btn">Retry Fetch</Button>
          </div>
        ) : news.length === 0 ? (
          <div className="empty-container">
            <div className="empty-icon">📂</div>
            <h3>No Specific Stocks Found</h3>
            <p>It seems like a quiet day for specific corporate filings, or data hasn't been aggregated yet for this date.</p>
          </div>
        ) : (
          <div className="news-content">
            <div className="content-header">
              <span className="live-indicator"></span>
              <h2>Market Pulse: Today's Buzzing Tickers</h2>
            </div>
            
            <ul className="news-list">
              {news.map((item, index) => (
                <li key={index} className="news-item">
                  <div className="bullet"></div>
                  <div className="item-body">
                    <p className="news-text">
                      <span className="company-tag">{item.company}</span>
                      <span className="news-divider">:</span>
                      {item.news}
                    </p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer" className="read-more">
                        Full Coverage ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      
      <footer className="integration-footer">
        <div className="footer-info">
          <h4>📊 Production Intelligence</h4>
          <p>These company data points are automatically fed into your Pre-Market & Post-Market reports.</p>
        </div>
        <Link href="/reports">
          <Button className="nav-reports-btn">Open Reports</Button>
        </Link>
      </footer>

      <style jsx>{`
        .stocks-news-container {
          padding: 2.5rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
          color: #e2e8f0;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2.5rem;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .title-gradient {
          font-size: 2.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.75rem 0;
          letter-spacing: -0.025em;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 1.1rem;
          max-width: 600px;
          line-height: 1.6;
        }
        .highlight-date {
          color: #a5b4fc;
          font-weight: 600;
        }
        .controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .date-picker-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .icon {
          position: absolute;
          left: 12px;
          font-size: 1.1rem;
          z-index: 10;
        }
        .custom-date-input {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: white;
          padding: 0.6rem 0.75rem 0.6rem 2.5rem;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s;
          font-weight: 500;
        }
        .custom-date-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        .refresh-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.2s, background 0.2s;
        }
        .refresh-btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }
        .news-main-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 2.5rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
          min-height: 500px;
        }
        .content-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .live-indicator {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 8px #ef4444;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .content-header h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f8fafc;
        }
        .news-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .news-item {
          display: flex;
          gap: 1.25rem;
          padding: 1.25rem;
          border-radius: 12px;
          transition: background 0.2s;
          border: 1px solid transparent;
        }
        .news-item:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .bullet {
          width: 12px;
          height: 12px;
          background: #6366f1;
          border-radius: 3px;
          margin-top: 0.45rem;
          flex-shrink: 0;
        }
        .news-text {
          line-height: 1.6;
          font-size: 1.05rem;
        }
        .company-tag {
          font-weight: 800;
          color: #fff;
          background: rgba(99, 102, 241, 0.15);
          padding: 0.1rem 0.5rem;
          border-radius: 4px;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .news-divider {
          color: #475569;
          margin: 0 0.5rem;
          font-weight: 400;
        }
        .read-more {
          display: inline-block;
          margin-top: 0.75rem;
          color: #818cf8;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: color 0.2s;
        }
        .read-more:hover {
          color: #a5b4fc;
        }
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 1.5rem;
        }
        .premium-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .integration-footer {
          margin-top: 2rem;
          background: linear-gradient(to right, rgba(79, 70, 229, 0.1), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }
        .footer-info h4 {
          margin: 0 0 0.4rem 0;
          color: #fff;
          font-size: 1.1rem;
        }
        .footer-info p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.95rem;
        }
        .nav-reports-btn {
          background: transparent;
          border: 1px solid #4f46e5;
          color: #a5b4fc;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .nav-reports-btn:hover {
          background: rgba(79, 70, 229, 0.1);
          border-color: #818cf8;
        }

        @media (max-width: 768px) {
          .stocks-news-container {
            padding: 1rem;
          }
          .title-gradient {
            font-size: 2rem;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .controls {
            width: 100%;
          }
          .custom-date-input {
            width: 100%;
          }
          .integration-footer {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
