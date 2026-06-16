"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterTeknisi() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup-teknisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Pendaftaran gagal. Coba lagi.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Tidak dapat terhubung. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    fontSize: 14,
    color: "#18181b",
    backgroundColor: "#fafafa",
    border: "1px solid #e4e4e7",
    borderRadius: 8,
    outline: "none",
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#333333", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#6366f1 0%,#818cf8 100%)" }} />
        <div style={{ padding: "36px 40px 40px" }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <polygon points="9,2 16,6 16,12 9,16 2,12 2,6" fill="white" opacity="0.9" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "0.08em", color: "#18181b" }}>
              PRISM<span style={{ color: "#6366f1" }}>_</span>
            </span>
          </div>

          {success ? (
            <div>
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#18181b" }}>Pendaftaran Berhasil</h2>
                <p style={{ margin: 0, fontSize: 14, color: "#71717a", lineHeight: 1.6 }}>
                  Akun Anda sudah dibuat dan sedang menunggu persetujuan dari admin.<br />
                  Hubungi admin untuk mempercepat proses approval.
                </p>
              </div>
              <Link href="/login" style={{ display: "block", textAlign: "center", marginTop: 20, padding: "11px 0", fontSize: 14, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#6366f1,#818cf8)", borderRadius: 8, textDecoration: "none" }}>
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#18181b" }}>Daftar sebagai Teknisi</h1>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#71717a" }}>Akun akan diaktifkan setelah disetujui admin</p>

              {error && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#3f3f46", marginBottom: 6 }}>Nama Lengkap</label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nama teknisi"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e4e4e7")}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#3f3f46", marginBottom: 6 }}>Email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@company.com"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e4e4e7")}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#3f3f46", marginBottom: 6 }}>Password</label>
                  <input
                    type="password" required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e4e4e7")}
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  style={{ marginTop: 4, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, color: "#fff", background: loading ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "Mendaftar…" : "Daftar"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link href="/login" style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}>
                  Sudah punya akun? Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
