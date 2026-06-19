"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  BarChart3,
  Bell,
  ClipboardList,
  Zap,
  ChevronDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";

/* ─── Keyframe animations injected via style tag ─── */
const ANIM_CSS = `
@keyframes float-slow {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-18px) rotate(2deg); }
}
@keyframes float-slow-r {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-14px) rotate(-2deg); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.30; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes badge-in {
  from { opacity: 0; transform: scale(0.85) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes morph {
  0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  50%       { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
}
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-float-slow  { animation: float-slow  6s ease-in-out infinite; }
.animate-float-slow-r{ animation: float-slow-r 7s ease-in-out infinite; }
.animate-pulse-glow  { animation: pulse-glow  4s ease-in-out infinite; }
.animate-slide-up    { animation: slide-up    0.7s cubic-bezier(.16,1,.3,1) both; }
.animate-fade-in     { animation: fade-in     0.8s ease both; }
.animate-badge-in    { animation: badge-in    0.6s cubic-bezier(.34,1.56,.64,1) both; }
.animate-spin-slow   { animation: spin-slow  20s linear infinite; }
.animate-morph       { animation: morph       8s ease-in-out infinite; }
.animate-ticker      { animation: ticker     30s linear infinite; }
.delay-100  { animation-delay: 0.1s; }
.delay-200  { animation-delay: 0.2s; }
.delay-300  { animation-delay: 0.3s; }
.delay-400  { animation-delay: 0.4s; }
.delay-500  { animation-delay: 0.5s; }
.delay-600  { animation-delay: 0.6s; }
.delay-700  { animation-delay: 0.7s; }
.delay-900  { animation-delay: 0.9s; }
.delay-1000 { animation-delay: 1.0s; }
.delay-1200 { animation-delay: 1.2s; }
`;

/* ─── Data ─── */
const FEATURES = [
  { icon: BrainCircuit, color: "from-violet-500 to-indigo-600",  glow: "rgba(99,102,241,0.3)",  title: "AI-Powered Prediction",   desc: "ML model trained on historical data predicts failure severity before it happens." },
  { icon: ClipboardList,color: "from-indigo-500 to-blue-600",   glow: "rgba(59,130,246,0.3)",  title: "Smart Ticketing",          desc: "Admin assigns tickets with planned dates. Technicians log execution, parts & cost." },
  { icon: Bell,          color: "from-blue-500 to-cyan-500",    glow: "rgba(6,182,212,0.3)",   title: "Real-Time Notifications",  desc: "Alerts on ticket assignment, completion, or overdue — every stakeholder in sync." },
  { icon: BarChart3,     color: "from-cyan-500 to-teal-500",    glow: "rgba(20,184,166,0.3)",  title: "Analytics Dashboard",      desc: "Live donut charts, maintenance trends, and asset health breakdowns." },
  { icon: ShieldCheck,   color: "from-teal-500 to-emerald-500", glow: "rgba(16,185,129,0.3)",  title: "Role-Based Access",        desc: "Admin & Technician roles with separate views. Approval flow for new technicians." },
  { icon: Zap,           color: "from-amber-500 to-orange-500", glow: "rgba(245,158,11,0.3)",  title: "Instant Asset Search",     desc: "Vector-database semantic search lets you query assets in natural language." },
];

const STATS = [
  { value: "100+", label: "Assets Tracked" },
  { value: "AI",   label: "Severity Prediction" },
  { value: "2",    label: "User Roles" },
  { value: "∞",    label: "Real-Time Alerts" },
];

const TICKER_ITEMS = [
  "AI-Powered Maintenance", "Smart Ticketing", "Real-Time Notifications",
  "Predictive Analytics", "Role-Based Access", "Vector Search",
  "Asset Health Scoring", "Maintenance Log", "Technician Portal",
];

const STEPS = [
  { step: "01", color: "border-violet-500/30 bg-violet-900/10 text-violet-400", ring: "shadow-[0_0_20px_rgba(139,92,246,0.2)]", title: "Asset Registered",       desc: "Admin adds an asset with category, location, criticality, and schedule. AI generates the initial severity prediction in the background." },
  { step: "02", color: "border-indigo-500/30 bg-indigo-900/10 text-indigo-400", ring: "shadow-[0_0_20px_rgba(99,102,241,0.2)]",  title: "Ticket Issued",          desc: "When maintenance is due, admin creates a ticket, sets the planned date, and assigns it to a specific technician." },
  { step: "03", color: "border-blue-500/30 bg-blue-900/10 text-blue-400",       ring: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",  title: "Technician Executes",    desc: "Technician receives a notification, fills in execution date, damage type, spare parts, cost — then marks it complete." },
  { step: "04", color: "border-cyan-500/30 bg-cyan-900/10 text-cyan-400",       ring: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",   title: "Log & Analytics Updated", desc: "Completed ticket flows into the Maintenance Log. Dashboard KPIs update in real time, feeding the next AI prediction cycle." },
];

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Video Player ─── */
function VideoPlayer() {
  const videoEl = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(true);
  const [started, setStarted] = useState(false);

  function toggle() {
    const v = videoEl.current;
    if (!v) return;
    if (!started) setStarted(true);
    if (v.paused) { void v.play(); setPlaying(true); }
    else          { v.pause();     setPlaying(false); }
  }

  function toggleMute() {
    const v = videoEl.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video group">
      <video
        ref={videoEl}
        src="/output3.mp4"
        muted
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Overlay — fades out after start */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-5 transition-opacity duration-500 ${started && playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
        style={{ background: started ? "rgba(0,0,0,0.3)" : "rgba(9,9,15,0.7)" }}
      >
        {!started && (
          <div className="text-center mb-2 animate-fade-in">
            <p className="text-white/70 text-[15px] font-semibold">PRISM — Product Demo</p>
            <p className="text-white/30 text-[12px] mt-1">Full walkthrough · AI Prediction · Ticketing · Dashboard</p>
          </div>
        )}

        {/* Play / pause button */}
        <button
          onClick={toggle}
          className="w-20 h-20 rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center hover:scale-110 hover:border-indigo-400/70 hover:bg-indigo-500/25 transition-all duration-300 shadow-[0_0_60px_rgba(99,102,241,0.3)]"
        >
          {playing
            ? <Pause className="w-8 h-8 text-white fill-white" />
            : <Play  className="w-8 h-8 text-white fill-white ml-1" />}
        </button>
      </div>

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 rounded-lg bg-black/50 border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all backdrop-blur-sm"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 4px)" }} />
    </div>
  );
}

/* ─── Feature Card with reveal ─── */
function FeatureCard({ f, delay }: { f: typeof FEATURES[0]; delay: number }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
      className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all duration-500 cursor-default ${inView ? "animate-slide-up" : "opacity-0"}`}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${f.glow}, transparent 70%)` }}
      />
      <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <f.icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="relative text-[15px] font-bold text-white mb-2">{f.title}</h3>
      <p className="relative text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
    </div>
  );
}

/* ─── Step row with reveal ─── */
function StepRow({ item, idx, total }: { item: typeof STEPS[0]; idx: number; total: number }) {
  const { ref, inView } = useInView(0.2);
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "both" }}
      className={`relative flex gap-8 pb-12 last:pb-0 ${inView ? "animate-slide-up" : "opacity-0"}`}
    >
      {idx < total - 1 && (
        <div className="absolute left-[27px] top-14 w-px h-[calc(100%-3.5rem)] bg-gradient-to-b from-white/10 to-transparent" />
      )}
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 text-[12px] font-bold font-mono ${item.color} ${item.ring} transition-all duration-300`}>
        {item.step}
      </div>
      <div className="pt-3.5">
        <h3 className="text-[17px] font-bold text-white mb-2">{item.title}</h3>
        <p className="text-[14px] text-white/40 leading-relaxed max-w-xl">{item.desc}</p>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  const videoSectionRef = useRef<HTMLElement>(null);
  const featuresInView  = useInView(0.05);
  const statsInView     = useInView(0.2);

  return (
    <div className="bg-[#09090f] text-white overflow-x-hidden" style={{ fontFamily: "'Akzidenz-Grotesk BQ', Arial, sans-serif" }}>
      <style>{ANIM_CSS}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-[#09090f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2.5 animate-fade-in">
          <Image src="/Logo.png" alt="PRISM" width={28} height={28} className="rounded-lg" />
          <span className="text-[15px] font-bold tracking-tight text-white">PRISM</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50 animate-fade-in delay-200">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#demo"     className="hover:text-white transition-colors">Demo</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
        </div>
        <Link href="/login" className="animate-fade-in delay-300 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[13px] font-semibold transition-colors">
          Sign In <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center pt-16 overflow-hidden">

        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-pulse-glow absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-indigo-700/20 blur-[140px]" />
          <div className="animate-float-slow  absolute top-1/3 -left-72 w-[700px] h-[700px] rounded-full bg-violet-800/12 blur-[130px]" />
          <div className="animate-float-slow-r absolute top-1/3 -right-72 w-[600px] h-[600px] rounded-full bg-blue-800/12 blur-[130px]" />
        </div>

        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Spinning ring decoration */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-spin-slow w-[700px] h-[700px] rounded-full border border-white/[0.03]" style={{ borderStyle: "dashed" }} />
          <div className="absolute animate-spin-slow w-[500px] h-[500px] rounded-full border border-white/[0.04]" style={{ animationDirection: "reverse", borderStyle: "dashed" }} />
        </div>

        {/* Title */}
        <h1 className="relative max-w-5xl">
          <span className="animate-slide-up delay-300 block text-5xl md:text-7xl lg:text-[88px] font-extrabold leading-[1.05] tracking-tight text-white">
            Predict. Prevent.
          </span>
          <span
            className="animate-slide-up delay-500 block text-5xl md:text-7xl lg:text-[88px] font-extrabold leading-[1.05] tracking-tight"
            style={{ background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 45%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Maintain.
          </span>
        </h1>

        <p className="animate-slide-up delay-700 relative mt-6 text-lg md:text-xl text-white/45 max-w-2xl leading-relaxed">
          PRISM is an intelligent asset management system that uses AI to predict maintenance needs,
          automate ticketing, and give real-time visibility across your entire facility.
        </p>

        {/* CTAs */}
        <div className="animate-slide-up delay-900 relative mt-10 flex items-center gap-4 flex-wrap justify-center">
          <Link href="/login" className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[15px] font-bold transition-all shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_70px_rgba(99,102,241,0.6)]">
            Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button
            onClick={() => videoSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[15px] font-bold transition-all"
          >
            <Play className="w-4 h-4 text-indigo-400 fill-current" /> Watch Demo
          </button>
        </div>

        {/* Scroll cue */}
        <div className="animate-bounce absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="relative overflow-hidden border-y border-white/5 py-3 bg-white/[0.015]">
        <div className="animate-ticker flex gap-12 whitespace-nowrap w-max">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="text-[12px] font-semibold text-white/20 uppercase tracking-widest flex items-center gap-4">
              {t}
              <span className="w-1 h-1 rounded-full bg-indigo-500/50" />
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="relative py-20 border-b border-white/5">
        <div ref={statsInView.ref} className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              className={`text-center ${statsInView.inView ? "animate-slide-up" : "opacity-0"}`}
            >
              <p className="text-4xl md:text-5xl font-extrabold"
                style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </p>
              <p className="mt-2 text-[12px] text-white/30 font-semibold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative py-28 px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-violet-900/10 blur-[130px]" />
        </div>
        <div className="max-w-6xl mx-auto">
          <div ref={featuresInView.ref} className={`text-center mb-16 ${featuresInView.inView ? "animate-slide-up" : "opacity-0"}`}>
            <p className="text-indigo-400 text-[12px] font-bold uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Everything you need to
              <br />
              <span className="text-white/30">run smarter maintenance</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} f={f} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO ── */}
      <section id="demo" ref={videoSectionRef} className="relative py-28 px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-900/10 blur-[120px] animate-pulse-glow" />
        </div>

        <div className="max-w-5xl mx-auto">
          {(() => { const { ref, inView } = useInView(); return (
            <div ref={ref} className={`text-center mb-12 ${inView ? "animate-slide-up" : "opacity-0"}`}>
              <p className="text-indigo-400 text-[12px] font-bold uppercase tracking-widest mb-3">Product Demo</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white">See PRISM in action</h2>
              <p className="mt-4 text-[15px] text-white/40 max-w-xl mx-auto leading-relaxed">
                Watch how PRISM transforms asset management from reactive guesswork into proactive intelligence.
              </p>
            </div>
          ); })()}

          {/* Glowing frame around video */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-blue-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(99,102,241,0.35)]">
              <VideoPlayer />
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" className="relative py-28 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          {(() => { const { ref, inView } = useInView(); return (
            <div ref={ref} className={`text-center mb-16 ${inView ? "animate-slide-up" : "opacity-0"}`}>
              <p className="text-indigo-400 text-[12px] font-bold uppercase tracking-widest mb-3">Workflow</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white">How it works</h2>
            </div>
          ); })()}
          <div>
            {STEPS.map((item, i) => (
              <StepRow key={i} item={item} idx={i} total={STEPS.length} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-36 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-[#09090f] to-violet-950/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-morph w-[700px] h-[700px] bg-indigo-700/10 blur-[100px]" />
          </div>
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        {(() => { const { ref, inView } = useInView(); return (
          <div ref={ref} className={`relative max-w-3xl mx-auto text-center ${inView ? "animate-slide-up" : "opacity-0"}`}>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Modernize your<br />asset maintenance
            </h2>
            <p className="text-[16px] text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
              PRISM brings AI prediction, smart ticketing, and real-time analytics into a single platform built for industrial facilities.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[16px] font-bold transition-all shadow-[0_0_60px_rgba(99,102,241,0.45)] hover:shadow-[0_0_90px_rgba(99,102,241,0.7)]">
              Launch PRISM <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ); })()}
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/Logo.png" alt="PRISM" width={22} height={22} className="rounded-md opacity-60" />
            <span className="text-[13px] font-bold text-white/40">PRISM</span>
            <span className="text-[12px] text-white/15 ml-1">— Predictive Reliability &amp; Intelligent System for Maintenance</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-white/20">
            <Link href="/login"            className="hover:text-white/50 transition-colors">Sign In</Link>
            <Link href="/register"         className="hover:text-white/50 transition-colors">Admin Register</Link>
            <Link href="/register/teknisi" className="hover:text-white/50 transition-colors">Technician Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
