"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Menu, X } from "lucide-react";
import { motion } from "framer-motion";

// ── Image assets (download these from Figma and place in /public/images/) ────
// hero-dashboard.png     → dashboard screenshot shown in hero (node 1:98 Frame)
// feature-asset-list.png → asset list/table screenshot (node 1:434 Mask group / image 21)
// arrow-up-right.svg     → small arrow icon used in Sign In button (node 1:352 Vector)
// ai-icon.svg            → sparkle/AI icon in "Powered with AI" badge (node 1:96 Vector)
// cube-logo.svg          → PRISM cube logo mark (node 1:80 Group 4)

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">
      <section id="about" className="relative bg-[#3e3e3e] overflow-hidden pb-0">
        <Image
          src="/bg-dashboard.png"
          alt=""
          fill
          className="object-cover pointer-events-none"
          priority
          aria-hidden
        />

        <nav className="relative z-50 flex items-center justify-between px-6 md:px-10 py-[31px]">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/ikon-landing.png"
              alt="PRISM logo"
              width={27}
              height={28}
            />
            <span
              className="text-[#fdfdfd] text-2xl tracking-[-0.96px]"
              style={{
                fontFamily: "'Host Grotesk', sans-serif",
                fontWeight: 600,
              }}
            >
              PRISM__
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-[62px]">
            {[
              { label: "About", href: "#about" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[#fdfdfd] text-[18px] tracking-[-0.72px] hover:opacity-70 transition-opacity"
                style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            href="/sign-in"
            className="hidden md:flex items-center gap-[17px] bg-[#3f65ed] text-[#f5f5f5] text-[12px] tracking-[-0.48px] px-[17px] py-[8px] rounded-[8px] hover:bg-[#3059d8] transition-colors"
            style={{
              fontFamily: "'Host Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Sign In
            <img src="/arrow.png" alt="" width={10} height={10} />
          </Link>

          <button
            className="md:hidden text-[#fdfdfd]"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-[#3e3e3e]/95 flex flex-col items-center justify-center gap-8">
            {[
              { label: "About", href: "#about" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[#fdfdfd] text-2xl tracking-tight"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              className="flex items-center gap-3 bg-[#3f65ed] text-white px-6 py-3 rounded-lg font-semibold mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In <ArrowRight size={16} />
            </Link>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-[35px] border border-[#3f65ed]/50 px-[14px] py-[3px] rounded-[8px] mb-8"
            style={{
              background:
                "linear-gradient(102.62deg, rgba(197,208,247,0.5) 0.52%, rgba(127,143,237,0.5) 46.44%, rgba(63,101,237,0.5) 99.04%)",
            }}
          >
            <span
              className="text-[#f5f5f5] text-[14px] tracking-[-0.56px]"
              style={{
                fontFamily: "'Host Grotesk', sans-serif",
                fontWeight: 500,
              }}
            >
              Powered with AI
            </span>
            <img src="/star.png" alt="" width={14} height={13} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[42px] sm:text-[60px] md:text-[87px] leading-[1.1] sm:leading-none tracking-[0] sm:tracking-[-3.48px] max-w-4xl mb-6 whitespace-normal sm:whitespace-nowrap"
            style={{
              fontFamily: "'Host Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            <span className="text-[#c5d0f7]">Predict.</span>
            <span className="text-[#fdfdfd]"> Prevent. Perform.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[#fdfdfd] text-[18px] sm:text-[20px] tracking-[-0.8px] max-w-[788px] mb-10 leading-normal"
            style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
          >
            PRISM transforms asset management with insights into asset health.
            Its analytics help anticipate maintenance needs, enhancing
            efficiency and performance. By optimizing resources and reducing
            downtime, PRISM boosts productivity and cost savings, positioning
            your organization for success.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Link
              href="/sign-up"
              className="bg-[#fdfdfd] text-[#3f65ed] text-[20px] tracking-[-0.8px] px-[17px] py-[8px] rounded-[8px] hover:bg-[#e8edff] transition-colors"
              style={{
                fontFamily: "'Host Grotesk', sans-serif",
                fontWeight: 600,
              }}
            >
              Sign Up Here
            </Link>
          </motion.div>
        </div>
        {/* Dashboard preview image */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 60 }}
          className="relative z-10 mx-auto mt-16 px-4 max-w-[1400px]"
        >
          <div
            className="rounded-t-[16px] overflow-hidden"
            style={{ background: "rgba(197,208,247,0.2)" }}
          >
            <Image
              src="/contoh-dashboard.png"
              alt="PRISM Dashboard"
              width={1400}
              height={810}
              className="w-full h-auto block"
              priority
            />
          </div>
        </motion.div>
      </section>

      <section id="features" className="bg-[#f9f9fb] px-6 md:px-[127px] pt-[231px] pb-[120px]">
        <div className="text-center mb-[231px]">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-[28px] md:text-[38px] leading-[1.2] md:leading-[35px] tracking-[-1.52px] text-[#3f65ed] capitalize max-w-[572px] mx-auto"
            style={{ fontFamily: "'Host Grotesk', sans-serif" }}
          >
            Transform maintenance records into{" "}
            <em style={{ fontWeight: 700, fontStyle: "italic" }}>
              proactive decisions.
            </em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-[#848484] text-[18px] tracking-[-0.72px] max-w-[542px] mx-auto leading-normal"
            style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
          >
            We help organizations predict maintenance needs, monitor asset
            health, and centralize maintenance operations—reducing downtime and
            improving equipment reliability.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 1.05 }}
            className="bg-[rgba(197,208,247,0.2)] rounded-[8px] p-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <img
                src="/landings2p1.svg"
                alt="Predict Maintenance"
                className="w-full h-full object-contain p-4"
              />
            </div>
            <div className="p-6 mt-auto">
              <h3
                className="text-[#3e3e3e] text-[18px] tracking-[-0.72px] mb-4 text-center"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 500,
                }}
              >
                Predict Maintenance Before Failures Happen
              </h3>
              <p
                className="text-[#848484] text-[12px] tracking-[-0.48px] text-center"
                style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
              >
                Monitor maintenance patterns and receive recommended maintenance
                frequencies based on historical records, complaint trends, and
                asset behavior.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 1.05 }}
            className="bg-[rgba(197,208,247,0.2)] rounded-[16px] overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <img
                src="/landings2p2.svg"
                alt="Asset list"
                className="w-full h-full object-contain p-4"
              />
            </div>
            <div className="p-6">
              <h3
                className="text-[#3e3e3e] text-[18px] tracking-[-0.72px] mb-4 text-center"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 500,
                }}
              >
                Manage Assets in One Centralized Platform
              </h3>
              <p
                className="text-[#848484] text-[12px] tracking-[-0.48px] text-center"
                style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
              >
                Store and organize asset information, maintenance records,
                replacement history, and operational details in a single
                workspace.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 1.05 }}
            className="bg-[rgba(197,208,247,0.2)] rounded-[8px] overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <img
                src="/landings2p3.svg"
                alt="Download Reports with AI"
                className="w-full h-full object-contain p-4"
              />
            </div>
            <div className="p-6 mt-auto">
              <h3
                className="text-[#3e3e3e] text-[18px] tracking-[-0.72px] mb-4 text-center"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 500,
                }}
              >
                Download Reports with AI
              </h3>
              <p
                className="text-[#848484] text-[12px] tracking-[-0.48px] text-center"
                style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
              >
                Generate maintenance reports and operational summaries for
                stakeholders with minimal manual effort.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════
          SECTION 3 + FOOTER — Combined with bg-landing-2.png
      ═══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/bg-2.png')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ── CTA Section ── */}
        <section className="relative z-10 py-[100px] md:py-[200px] px-6">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-[#fdfdfd] text-[32px] sm:text-[50px] tracking-[-2px] capitalize mb-8"
              style={{
                fontFamily: "'Host Grotesk', sans-serif",
                fontWeight: 600,
              }}
            >
              Don&apos;t wait for equipment failures.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[#fdfdfd] text-[20px] tracking-[-0.8px] max-w-[631px] mx-auto mb-12 leading-normal"
              style={{ fontFamily: "'Akzidenz-Grotesk BQ', sans-serif" }}
            >
              Stay ahead of maintenance needs with predictive insights that help
              your team prevent disruptions before they happen.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-[35px] bg-[#3f65ed] text-[#f5f5f5] text-[20px] tracking-[-0.8px] px-[17px] py-[8px] rounded-[8px] hover:bg-[#3059d8] transition-colors"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 600,
                }}
              >
                Start Managing Smarter
                <ArrowRight size={21} />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="relative z-10 px-6 md:px-[58px] pt-[60px] md:pt-[120px] pb-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-4 gap-y-8 mb-16 items-start"
          >
            {/* Brand */}
            <div>
              <p
                className="text-[#3f65ed] text-[28px] leading-[1.82] tracking-[-1.12px]"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 700,
                  fontStyle: "italic",
                }}
              >
                Reduce Risks.
                <br />
                Extend Asset Life.
              </p>
            </div>

            {/* Pages label */}
            <div className="pt-1">
              <p
                className="text-[#3f65ed] text-[20px] tracking-[-0.8px]"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 500,
                }}
              >
                Pages
              </p>
            </div>

            {/* Page links */}
            <div>
              <ul className="space-y-1">
                {["About", "Features", "Sign Up"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-[#3f65ed] text-[36px] md:text-[48px] tracking-[-1.92px] leading-tight hover:opacity-70 transition-opacity block"
                      style={{
                        fontFamily: "'Akzidenz-Grotesk BQ', sans-serif",
                      }}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us label */}
            <div className="pt-1">
              <p
                className="text-[#fdfdfd] text-[20px] tracking-[-0.8px]"
                style={{
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontWeight: 500,
                }}
              >
                Contact Us
              </p>
            </div>

            {/* Contact links */}
            <div>
              <ul className="space-y-1">
                {["Instagram", "LinkedIn", "WhatsApp"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-[#fdfdfd] text-[36px] md:text-[48px] tracking-[-1.92px] leading-tight hover:opacity-70 transition-opacity block"
                      style={{
                        fontFamily: "'Akzidenz-Grotesk BQ', sans-serif",
                      }}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Giant PRISM watermark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="overflow-hidden -mx-[58px]"
          >
            <p
              className="text-[#fdfdfd] text-center select-none"
              style={{
                fontFamily: "'Host Grotesk', sans-serif",
                fontWeight: 500,
                fontSize: "clamp(80px, 20vw, 320px)",
                letterSpacing: "-20px",
                lineHeight: 0.9,
                opacity: 1,
                filter: "blur(0px)",
              }}
            >
              PRISM
            </p>
          </motion.div>
        </footer>
      </div>
    </div>
  );
}
