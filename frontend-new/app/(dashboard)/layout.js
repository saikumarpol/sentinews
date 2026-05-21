"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import IndicesTickerBar from "@/components/layout/IndicesTickerBar/IndicesTickerBar";
import StocksInFocusTicker from "@/components/layout/StocksInFocusTicker/StocksInFocusTicker";
import Link from "next/link";

const NAV_TABS = [
  { id: "market", href: "/market", label: "📰 Market" },
  { id: "daily-news", href: "/market/daily-news", label: "📈 Stocks in News" },
  { id: "screener", href: "/screener", label: "🎯 Screener" },
  { id: "reports", href: "/reports", label: "📋 Reports" },
  { id: "watchlist", href: "/watchlist", label: "⭐ Watchlist" },
  { id: "portfolio", href: "/portfolio", label: "💼 Portfolio" },
];

const MARKET_DROPDOWN = [
  { id: "commodities", label: "🛢 Commodities",  href: "/commodities" },
  { id: "indices",     label: "🌍 Global Indices", href: "/indices" },
  { id: "currencies",  label: "💱 Currencies",   href: "/currencies" },
];

export default function DashboardLayout({ children }) {
  const { authToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href) => pathname === href || (href === "/market" && pathname === "/");

  // Authentication Guard - only for sensitive pages
  useEffect(() => {
    const isProtected = pathname.startsWith("/watchlist") || pathname.startsWith("/portfolio");
    if (isProtected && !authToken) {
      router.push("/login");
    }
  }, [authToken, router, pathname]);

  // If on a protected page without a token, show loading while redirecting
  const isProtectedPath = pathname.startsWith("/watchlist") || pathname.startsWith("/portfolio");
  if (isProtectedPath && !authToken) return <div className="page-loading">Redirecting to login...</div>;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="app-container">
      <IndicesTickerBar />
      <StocksInFocusTicker />

      <header className="app-header">
        <Link href="/market" className="app-logo" style={{ textDecoration: "none" }}>
          Sentinews
        </Link>

        {/* Desktop Nav */}
        <nav className="app-navbar">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`nav-btn ${pathname.startsWith(tab.href) ? "nav-btn-active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}

          {/* Market Dropdown */}
          <div className="nav-dropdown">
            <button className={`nav-btn ${MARKET_DROPDOWN.some(d => pathname.startsWith(d.href)) ? "nav-btn-active" : ""}`}>
              📊 Market <span style={{ fontSize: "0.6rem", marginLeft: "4px", opacity: 0.6 }}>▼</span>
            </button>
            <div className="nav-dropdown-content">
              {MARKET_DROPDOWN.map((item) => (
                <Link 
                  key={item.id} 
                  href={item.href} 
                  className={`dropdown-item ${pathname.startsWith(item.href) ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {authToken ? (
            <button className="nav-btn nav-logout" onClick={handleLogout}>Logout</button>
          ) : (
            <Link href="/login" className="nav-btn nav-login">Login</Link>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-nav-drawer">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`nav-btn ${pathname.startsWith(tab.href) ? "nav-btn-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {tab.label}
            </Link>
          ))}
          <div style={{ padding: "8px 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Market</div>
          {MARKET_DROPDOWN.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-btn ${pathname.startsWith(item.href) ? "nav-btn-active" : ""}`}
              onClick={() => setMenuOpen(false)}
              style={{ marginLeft: "12px" }}
            >
              {item.label}
            </Link>
          ))}
          {authToken ? (
            <button className="nav-btn nav-logout" onClick={handleLogout}>Logout</button>
          ) : (
            <Link href="/login" className="nav-btn nav-login" onClick={() => setMenuOpen(false)}>Login</Link>
          )}
        </div>
      )}

      <main className="dashboard-content">
        {children}
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .dashboard-content {
          flex: 1;
          background: #0f172a;
        }
      `}</style>
    </div>
  );
}
