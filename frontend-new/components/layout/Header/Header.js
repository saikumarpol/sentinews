"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_TABS = [
  { id: "market",      label: "📡 Feed",        href: "/market" },
  { id: "indices",     label: "📊 Indices",      href: "/indices" },
  { id: "commodities", label: "🛢 Commodities", href: "/commodities" },
  { id: "currencies",  label: "💱 Currencies",   href: "/currencies" },
  { id: "daily-news",  label: "📅 Daily News",  href: "/market/daily-news" },
];

const HUB_DROPDOWN = [
  { id: "screener",    label: "🎯 Screener",     href: "/screener" },
  { id: "reports",     label: "📋 Reports",      href: "/reports" },
  { id: "watchlist",   label: "⭐ Watchlist",    href: "/watchlist" },
  { id: "portfolio",   label: "💼 Portfolio",    href: "/portfolio" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href) => pathname === href || (href === "/market" && pathname === "/");

  return (
    <>
      <header className="app-header">
        <Link href="/market" className="app-logo">
          📡 Sentinews
        </Link>

        {/* Desktop Nav */}
        <nav className="app-navbar">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`nav-btn ${isActive(tab.href) ? "nav-btn-active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}

          {/* My Hub Dropdown */}
          <div className="nav-dropdown">
            <button className={`nav-btn ${HUB_DROPDOWN.some(d => isActive(d.href)) ? "nav-btn-active" : ""}`}>
              📂 My Hub <span style={{ fontSize: "0.6rem", marginLeft: "4px", opacity: 0.6 }}>▼</span>
            </button>
            <div className="nav-dropdown-content">
              {HUB_DROPDOWN.map((item) => (
                <Link 
                  key={item.id} 
                  href={item.href} 
                  className={`dropdown-item ${isActive(item.href) ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {pathname.startsWith("/stock/") && (
             <button className="nav-btn nav-btn-active" style={{ opacity: 0.85 }}>
                📈 {pathname.split("/").pop()}
             </button>
          )}
          <button className="nav-btn nav-logout" onClick={handleLogout}>Logout</button>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
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
              className={`nav-btn ${isActive(tab.href) ? "nav-btn-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {tab.label}
            </Link>
          ))}
          <div style={{ padding: "8px 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hub</div>
          {HUB_DROPDOWN.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-btn ${isActive(item.href) ? "nav-btn-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {pathname.startsWith("/stock/") && (
            <button className="nav-btn nav-btn-active" style={{ opacity: 0.85 }}>
               📈 {pathname.split("/").pop()}
            </button>
          )}
          <button className="nav-btn nav-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </>
  );
}
