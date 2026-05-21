"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup as apiSignup } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
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
            const data = await apiSignup(email, password);
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
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Sign up to continue to Sentinews</p>

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
                            placeholder="At least 6 characters"
                            minLength={6}
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Sign up"}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?
                    <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => router.push("/login")}
                    >
                        Log in
                    </button>
                </p>
            </div>
        </div>
    );
}
