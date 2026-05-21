// lib/api.js

const getHost = () => {
  if (typeof window === "undefined") return "127.0.0.1";
  return window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
};
// Update to use versioned API prefix
// const BASE = process.env.NEXT_PUBLIC_API_URL || `http://${getHost()}:8000/api/v1`;
const BASE = process.env.NEXT_PUBLIC_API_URL || `http://${getHost()}:8000`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: { 
      "Content-Type": "application/json", 
      ...options.headers 
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── Auth ───────────────────────────────── */
export async function signup(email, password) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email: email.toLowerCase(), password }),
  });
}

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email.toLowerCase());
  form.append("password", password);
  return request("/auth/login", {
    method: "POST",
    body: form,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.toLowerCase() }),
  });
}

/* ── Market & News ──────────────────────── */
export const fetchMarketFeed = (isFutures = false) => request(`/market-feed${isFutures ? "?futures=true" : ""}`);
export const fetchCommoditiesDashboard = (isFutures = false) => request(`/market-feed${isFutures ? "?futures=true" : ""}`); // Simplified in new structure
export const fetchIndicesDashboard = (isFutures = false) => request(`/market-feed${isFutures ? "?futures=true" : ""}`); // Simplified
export const fetchCurrenciesDashboard = (isFutures = false) => request(`/market-feed${isFutures ? "?futures=true" : ""}`); // Simplified

/* ── Symbol search ──────────────────────── */
export const searchSymbols = (query) =>
  request(`/market/search?query=${encodeURIComponent(query)}`);

/* ── Watchlist performance ───────────────── */
export const fetchPerformance = (symbol, token) =>
  request(`/stocks/${encodeURIComponent(symbol)}/performance`, {
    headers: authHeaders(token),
  });

/* ── Notes (requires auth) ───────────────── */
export const fetchNote = (symbol, token) =>
  request(`/stocks/notes/${symbol}`, { headers: authHeaders(token) });

export const saveNote = (symbol, text, token) =>
  request(`/stocks/notes/${symbol}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  });

/* ── Stock detail ────────────────────────── */
export const fetchStockDetail = (symbol) => request(`/stocks/${symbol}/performance`); // Simplified fallback
export const fetchStockHistory = (symbol, range = "1Y") =>
  request(`/stocks/${symbol}/performance`); // Simplified fallback
export const fetchStockNews = (symbol) => request(`/market-feed`); // Simplified fallback

/* ── Portfolio (requires auth) ───────────── */
export const fetchPortfolioSnapshot = (token) =>
  request("/portfolio/snapshot", { headers: authHeaders(token) });

export const fetchPortfolioNews = (token) =>
  request("/market-feed", { headers: authHeaders(token) }); // Simplified

export const addPortfolioHolding = (token, symbol, qty, avg_price) =>
  request("/portfolio", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ symbol, qty, avg_price }),
  });

export const removePortfolioHolding = (token, symbol) =>
  request(`/portfolio/${symbol}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

/* ── Live Indian Market Data ────────────── */
export const fetchLiveIndices = () => request("/market/indices");
export const fetchTopGainers = () => request("/market/top-gainers");
export const fetchTopLosers = () => request("/market/top-losers");
export const fetchLiveQuote = (symbol) =>
  request(`/market/live-quote/${encodeURIComponent(symbol)}`);
export const fetchMarketStatus = () => request("/market/market-status");
export const fetchEvents = () => request("/market/events");
export const fetchStocksInFocus = () => request("/market/stocks-in-focus");
export const fetchDailyNewsData = (date) => request(`/market/daily-news?date=${date}`);

/* ── Market Reports ──────────────────────── */
export const fetchPreMarketReport = () => request("/reports/pre-market");
export const fetchPostMarketReport = () => request("/reports/post-market");

/* ── Screener ────────────────────────────── */
export const fetchScreenerData = () => request("/screener");
