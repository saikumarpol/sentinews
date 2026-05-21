"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await apiLogin(email, password);
            login(data.access_token);
            router.push("/");
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Log in to your Sentinews account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-label">
                        Email
                        <input
                            type="email"
                            className="auth-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="auth-label">
                        Password
                        <input
                            type="password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            required
                        />
                    </div>

                    <div style={{ textAlign: "right", marginTop: "-0.5rem", marginBottom: "1rem" }}>
                        <button
                            type="button"
                            className="auth-link-button"
                            style={{ fontSize: "0.85rem", opacity: 0.8 }}
                            onClick={() => router.push("/forgot-password")}
                        >
                            Forgot password?
                        </button>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <p className="auth-switch">
                    New here?
                    <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => router.push("/signup")}
                    >
                        Create an account
                    </button>
                </p>
            </div>
        </div>
    );
}
