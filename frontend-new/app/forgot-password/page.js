"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await forgotPassword(email);
            setMessage(res.message);
        } catch (err) {
            setError(err.message || "Failed to send reset link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Reset password</h2>
                <p className="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>

                {message ? (
                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                        <div style={{ color: "#10b981", padding: "1rem", background: "rgba(16,185,129,0.1)", borderRadius: "8px", marginBottom: "1.5rem" }}>
                            {message}
                        </div>
                        <button className="auth-button" style={{ width: "100%" }} onClick={() => router.push("/login")}>
                            Back to Login
                        </button>
                    </div>
                ) : (
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

                        {error && <div className="auth-error">{error}</div>}

                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Sending..." : "Send reset link"}
                        </button>
                        <button
                            type="button"
                            className="auth-link-button"
                            style={{ display: "block", margin: "1rem auto" }}
                            onClick={() => router.push("/login")}
                        >
                            Back to login
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
