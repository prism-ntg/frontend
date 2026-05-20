"use client";

import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? "Invalid credentials. Please try again.");
      }
      // On success, handle redirect / session as needed
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
      if (!error) {
        window.location.href = "/";
      }
    }
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        minHeight: "100vh",
        display: "flex",
      }}
    >
      {/* ── Main area ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          backgroundColor: "#333333", // Dark gray background from image
        }}
      >
        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            boxShadow:
              "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Card top bar */}
          <div
            style={{
              height: 4,
              background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
            }}
          />

          <div style={{ padding: "36px 40px 40px" }}>
            {/* Wordmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <polygon
                    points="9,2 16,6 16,12 9,16 2,12 2,6"
                    fill="white"
                    opacity="0.9"
                  />
                </svg>
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  letterSpacing: "0.08em",
                  color: "#18181b",
                }}
              >
                PRISM<span style={{ color: "#3b82f6" }}>__</span>
              </span>
            </div>

            {/* Heading */}
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: 22,
                fontWeight: 700,
                color: "#18181b",
                letterSpacing: "-0.01em",
              }}
            >
              Welcome back
            </h1>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 14,
                color: "#71717a",
                lineHeight: 1.5,
              }}
            >
              Sign in to your dashboard
            </p>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#dc2626"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 8v4M12 16h.01"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#3f3f46",
                    marginBottom: 6,
                  }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#18181b",
                    backgroundColor: "#fafafa",
                    border: "1px solid #e4e4e7",
                    borderRadius: 8,
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "#e4e4e7")}
                />
              </div>

              {/* Password */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{ fontSize: 13, fontWeight: 500, color: "#3f3f46" }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: 12,
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#18181b",
                    backgroundColor: "#fafafa",
                    border: "1px solid #e4e4e7",
                    borderRadius: 8,
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "#e4e4e7")}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#ffffff",
                  background: loading
                    ? "#93c5fd"
                    : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  border: "none",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.01em",
                  transition: "opacity 0.15s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {loading ? (
                  <>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ animation: "spin 0.8s linear infinite" }}
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="3"
                        strokeOpacity="0.3"
                      />
                      <path
                        d="M12 2a10 10 0 0110 10"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "24px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: "#e4e4e7" }} />
              <span
                style={{ fontSize: 12, color: "#a1a1aa", whiteSpace: "nowrap" }}
              >
                New to PRISM?
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#e4e4e7" }} />
            </div>

            <a
              href="/register"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 0",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 500,
                color: "#3b82f6",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                textDecoration: "none",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#dbeafe")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#eff6ff")
              }
            >
              Create an account
            </a>
          </div>
        </div>

        {/* Footnote */}
        <p
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 12,
            color: "#a1a1aa",
            textAlign: "center",
          }}
        >
          © 2026 PRISM__. All rights reserved.
        </p>
      </main>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
