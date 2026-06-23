"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type Role = "admin" | "teknisi";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function AuthPage() {
  const reduced = usePrefersReducedMotion();

  const [overlayOnRight, setOverlayOnRight] = useState(true);
  const [overlayIsHello, setOverlayIsHello] = useState(true);
  const [contentVisible, setContentVisible] = useState(true);
  // increments on every content swap → forces remount → re-triggers CSS entrance animations
  const [animKey, setAnimKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  // — Login —
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // — Register —
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [regErrors, setRegErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function goToRegister() {
    setContentVisible(false);
    setOverlayOnRight(false);
    setTimeout(() => {
      setOverlayIsHello(false);
      setAnimKey((k) => k + 1);
      setContentVisible(true);
    }, 450);
  }

  function goToLogin() {
    setContentVisible(false);
    setOverlayOnRight(true);
    setTimeout(() => {
      setOverlayIsHello(true);
      setAnimKey((k) => k + 1);
      setContentVisible(true);
    }, 450);
    setRegSuccess(false);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!loginEmail) errs.email = "Email is required";
    else if (!loginEmail.includes("@")) errs.email = "Include an @ in your email address";
    if (!loginPassword) errs.password = "Password is required";
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    setLoginErrors({});
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data?.message ?? "Invalid credentials. Please try again.");
      } else {
        window.location.href =
          data.role === "teknisi" ? "/technician/tickets" : "/dashboard";
      }
    } catch {
      setLoginError("Unable to connect. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: { name?: string; email?: string; password?: string } = {};
    if (!name) errs.name = "Full name is required";
    if (!regEmail) errs.email = "Email is required";
    else if (!regEmail.includes("@")) errs.email = "Include an @ in your email address";
    if (!regPassword) errs.password = "Password is required";
    if (Object.keys(errs).length) { setRegErrors(errs); return; }
    setRegErrors({});
    setRegLoading(true);
    setRegError("");
    try {
      const endpoint =
        role === "teknisi" ? "/api/auth/signup-teknisi" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: regEmail, password: regPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegError(data?.message ?? "Failed to create account. Please try again.");
      } else {
        if (role === "teknisi") {
          setRegSuccess(true);
        } else {
          goToLogin();
        }
      }
    } catch {
      setRegError("Unable to connect. Please try again.");
    } finally {
      setRegLoading(false);
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  function inputCls(hasError?: boolean) {
    return `w-full px-4 py-2.5 text-sm rounded-lg outline-none border bg-white/5 placeholder:text-slate-500 text-slate-100 focus:ring-2 ${
      hasError
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
        : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/10"
    }`;
  }

  const inputTransition: React.CSSProperties = {
    transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
  };

  const btnStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
    transition: "transform 120ms ease-out, opacity 120ms ease-out",
  };

  const overlayBtnStyle: React.CSSProperties = {
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.4)",
    transition: "transform 120ms ease-out, opacity 120ms ease-out",
  };

  const cardEntry: React.CSSProperties = {
    opacity: mounted ? 1 : 0,
    transform: reduced ? undefined : mounted ? "scale(1)" : "scale(0.97)",
    transition: reduced
      ? "opacity 300ms ease-out"
      : "opacity 400ms cubic-bezier(0.23,1,0.32,1), transform 400ms cubic-bezier(0.23,1,0.32,1)",
  };

  const overlaySlide: React.CSSProperties = {
    background: "linear-gradient(175deg, #0e1420 0%, #111827 60%, #0f172a 100%)",
    transform: overlayOnRight ? "translateX(100%)" : "translateX(0%)",
    transition: reduced ? "none" : "transform 750ms cubic-bezier(0.25,1,0.5,1)",
  };

  // Parent fades out on exit; entry is handled by children's CSS animations
  const contentWrapStyle: React.CSSProperties = {
    opacity: contentVisible ? 1 : 0,
    transition: "opacity 80ms ease-out",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "#0F172A" }}
    >
      {/* Card */}
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          maxWidth: 760,
          height: 540,
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
          background: "#111827",
          ...cardEntry,
        }}
      >
        {/* ── Ambient parallax layer — behind everything ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Central blob — shifts with overlay (same direction, ~20% travel = parallax depth) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "22rem",
              height: "22rem",
              transform: `translate(-50%, -50%) translateX(${overlayOnRight ? "20%" : "-20%"})`,
              transition: reduced ? "none" : "transform 750ms cubic-bezier(0.25,1,0.5,1)",
              willChange: "transform",
            }}
          >
            <div
              className="anim-ambient-a"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "9999px",
                background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)",
              }}
            />
          </div>

          {/* Bottom blob — counter-shifts (opposite direction, slower) */}
          <div
            style={{
              position: "absolute",
              bottom: "-3rem",
              left: "50%",
              width: "18rem",
              height: "18rem",
              transform: `translateX(calc(-50% + ${overlayOnRight ? "-12%" : "12%"}))`,
              transition: reduced ? "none" : "transform 1000ms cubic-bezier(0.25,1,0.5,1)",
              willChange: "transform",
            }}
          >
            <div
              className="anim-ambient-b"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "9999px",
                background: "radial-gradient(circle, rgba(79,70,229,0.055) 0%, transparent 65%)",
              }}
            />
          </div>
        </div>

        {/* ── Login form (left half) ── */}
        <div
          className={`absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col items-center justify-center px-6 md:px-10 transition-all duration-500 ${
            overlayOnRight ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
          }`}
        >
          <h2 className="text-[1.55rem] font-bold text-slate-100 mb-6 tracking-tight">
            Sign In
          </h2>

          {loginError && (
            <p className="text-xs text-red-400 mb-3 text-center">{loginError}</p>
          )}

          <form onSubmit={handleLogin} noValidate className="w-full space-y-3">
            <div>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
                placeholder="Email"
                className={inputCls(!!loginErrors.email)}
                style={inputTransition}
              />
              {loginErrors.email && <p className="field-error text-xs text-red-400 mt-1.5 pl-1">{loginErrors.email}</p>}
            </div>
            <div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
                placeholder="Password"
                className={inputCls(!!loginErrors.password)}
                style={inputTransition}
              />
              {loginErrors.password && <p className="field-error text-xs text-red-400 mt-1.5 pl-1">{loginErrors.password}</p>}
            </div>
            <div className="text-center pt-0.5">
              <a
                href="#"
                className="text-xs text-slate-500 hover:text-slate-300"
                style={{ transition: "color 150ms ease-out" }}
              >
                Forgot your password?
              </a>
            </div>
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loginLoading}
                className="px-10 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-85 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                style={btnStyle}
              >
                {loginLoading ? "Signing in…" : "Sign In"}
              </button>
            </div>
            <div className="md:hidden text-center mt-4 pb-2">
              <p className="text-xs text-slate-400">
                Don't have an account?{" "}
                <button type="button" onClick={goToRegister} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Sign Up</button>
              </p>
            </div>
          </form>
        </div>

        {/* ── Register form (right half) ── */}
        <div
          className={`absolute inset-y-0 right-0 w-full md:w-1/2 flex flex-col items-center justify-center px-6 md:px-10 transition-all duration-500 ${
            !overlayOnRight ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
          }`}
        >
          {regSuccess ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30"
                style={{ background: "rgba(99,102,241,0.15)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-slate-100 text-lg mb-2">
                Account Submitted!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-45 mx-auto">
                Your technician account is pending admin approval.
              </p>
              <button
                onClick={goToLogin}
                className="px-8 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-85 active:scale-[0.97]"
                style={btnStyle}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[1.55rem] font-bold text-slate-100 mb-5 tracking-tight">
                Create Account
              </h2>

              {/* Role toggle */}
              <div
                className="flex gap-1 mb-4 p-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                {(["admin", "teknisi"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="px-5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                    style={{
                      transition:
                        "background 150ms ease-out, color 150ms ease-out, transform 120ms ease-out",
                      ...(role === r
                        ? {
                            background:
                              "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                            color: "#fff",
                          }
                        : { color: "#64748b" }),
                    }}
                  >
                    {r === "admin" ? "Admin" : "Technician"}
                  </button>
                ))}
              </div>

              {regError && (
                <p className="text-xs text-red-400 mb-3 text-center">{regError}</p>
              )}

              <form onSubmit={handleRegister} noValidate className="w-full space-y-3">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (regErrors.name) setRegErrors(p => ({ ...p, name: undefined })); }}
                    placeholder="Full Name"
                    className={inputCls(!!regErrors.name)}
                    style={inputTransition}
                  />
                  {regErrors.name && <p className="field-error text-xs text-red-400 mt-1.5 pl-1">{regErrors.name}</p>}
                </div>
                <div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="Email"
                    className={inputCls(!!regErrors.email)}
                    style={inputTransition}
                  />
                  {regErrors.email && <p className="field-error text-xs text-red-400 mt-1.5 pl-1">{regErrors.email}</p>}
                </div>
                <div>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
                    placeholder="Password"
                    className={inputCls(!!regErrors.password)}
                    style={inputTransition}
                  />
                  {regErrors.password && <p className="field-error text-xs text-red-400 mt-1.5 pl-1">{regErrors.password}</p>}
                </div>
                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="px-10 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-85 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={btnStyle}
                  >
                    {regLoading ? "Creating…" : "Sign Up"}
                  </button>
                </div>
                <div className="md:hidden text-center mt-4 pb-2">
                  <p className="text-xs text-slate-400">
                    Already have an account?{" "}
                    <button type="button" onClick={goToLogin} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Sign In</button>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>

        {/* ── Sliding overlay panel ── */}
        <div
          className="hidden md:block absolute inset-y-0 left-0 w-1/2 z-20 overflow-hidden"
          style={overlaySlide}
        >
          {/* Breathing indigo glow */}
          <div
            className="absolute top-0 inset-x-0 h-52 pointer-events-none anim-glow"
            style={{
              background:
                "radial-gradient(ellipse at 50% -10%, rgba(99,102,241,0.35) 0%, transparent 70%)",
            }}
          />

          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Drifting blob — bottom left */}
          <div
            className="absolute pointer-events-none anim-blob-a"
            style={{
              bottom: "-5rem",
              left: "-5rem",
              width: "18rem",
              height: "18rem",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
              willChange: "transform",
            }}
          />

          {/* Drifting blob — top right */}
          <div
            className="absolute pointer-events-none anim-blob-b"
            style={{
              top: "-4rem",
              right: "-4rem",
              width: "14rem",
              height: "14rem",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 65%)",
              willChange: "transform",
            }}
          />

          {/* ── Content (remounts on every swap to re-trigger stagger) ── */}
          <div
            key={animKey}
            className="relative z-10 h-full flex flex-col items-center justify-center px-10 text-center"
            style={contentWrapStyle}
          >
            {/* Logo — stagger 0 */}
            <div
              className="flex items-center gap-2.5 mb-8 anim-item"
              style={{ animationDelay: "0ms" }}
            >
              <Image src="/Logo.png" alt="PRISM" width={32} height={32} style={{ objectFit: "contain" }} />
              <span
                className="text-[22px] font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #f1f5f9 0%, #a5b4fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                PRISM
              </span>
            </div>

            {overlayIsHello ? (
              <>
                {/* Heading — stagger 1 */}
                <h2
                  className="text-2xl font-bold text-slate-100 mb-3 anim-item"
                  style={{ animationDelay: "80ms" }}
                >
                  Hello Friend!
                </h2>
                {/* Body — stagger 2 */}
                <p
                  className="text-sm text-slate-400 leading-relaxed mb-8 max-w-47.5 anim-item"
                  style={{ animationDelay: "160ms" }}
                >
                  Enter your personal details and start your journey with us
                </p>
                {/* Button — stagger 3 */}
                <button
                  onClick={goToRegister}
                  className="px-8 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-80 active:scale-[0.97] anim-item"
                  style={{ ...overlayBtnStyle, animationDelay: "240ms" }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <h2
                  className="text-2xl font-bold text-slate-100 mb-3 anim-item"
                  style={{ animationDelay: "80ms" }}
                >
                  Welcome Back!
                </h2>
                <p
                  className="text-sm text-slate-400 leading-relaxed mb-8 max-w-47.5 anim-item"
                  style={{ animationDelay: "160ms" }}
                >
                  To keep connected with us please login with your personal info
                </p>
                <button
                  onClick={goToLogin}
                  className="px-8 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-80 active:scale-[0.97] anim-item"
                  style={{ ...overlayBtnStyle, animationDelay: "240ms" }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600">© 2026 PRISM. All rights reserved.</p>

      <style>{`
        /* ── Staggered text entrance ── */
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .anim-item {
          animation: slide-up-fade 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ── Drifting background blobs ── */
        @keyframes blob-drift-a {
          0%, 100% { transform: translate(0,    0)    scale(1);    }
          35%      { transform: translate(-14px, -22px) scale(1.07); }
          65%      { transform: translate(9px,   16px)  scale(0.96); }
        }

        @keyframes blob-drift-b {
          0%, 100% { transform: translate(0,    0)    scale(1);    }
          40%      { transform: translate(16px, -12px) scale(1.05); }
          72%      { transform: translate(-7px,  18px)  scale(0.95); }
        }

        .anim-blob-a { animation: blob-drift-a 9s  ease-in-out infinite; }
        .anim-blob-b { animation: blob-drift-b 13s ease-in-out infinite; }

        /* ── Breathing indigo glow ── */
        @keyframes glow-breathe {
          0%, 100% { opacity: 1;    transform: scaleY(1);    }
          50%      { opacity: 0.55; transform: scaleY(0.92); }
        }

        .anim-glow { animation: glow-breathe 5s ease-in-out infinite; }

        /* ── Ambient background (behind form panels) ── */
        @keyframes ambient-drift-a {
          0%, 100% { transform: translate(0,   0)   scale(1);    }
          40%      { transform: translate(-8px, -12px) scale(1.03); }
          70%      { transform: translate(6px,  8px)  scale(0.98); }
        }

        @keyframes ambient-drift-b {
          0%, 100% { transform: translate(0,   0)  scale(1);    }
          35%      { transform: translate(10px, -8px) scale(1.04); }
          65%      { transform: translate(-5px, 10px) scale(0.97); }
        }

        .anim-ambient-a { animation: ambient-drift-a 14s ease-in-out infinite; }
        .anim-ambient-b { animation: ambient-drift-b 18s ease-in-out infinite; }

        /* ── Inline field error entrance ── */
        @keyframes error-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .field-error { animation: error-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both; }

        /* ── Reduced motion: kill all transforms, keep opacity ── */
        @media (prefers-reduced-motion: reduce) {
          .anim-item,
          .anim-blob-a,
          .anim-blob-b,
          .anim-glow,
          .anim-ambient-a,
          .anim-ambient-b,
          .field-error {
            animation: none !important;
          }
          * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
