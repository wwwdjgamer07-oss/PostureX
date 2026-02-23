"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Timer, Waves } from "lucide-react";

export function Hero() {
  return (
    <section className="section-shell relative overflow-hidden pb-20 pt-16 sm:pt-24">
      <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Enterprise AI posture intelligence
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-5xl xl:text-6xl">
            Real-time ergonomic intelligence for teams and individuals.
          </h1>
          <p className="max-w-xl text-base text-slate-300 md:text-lg">
            PostureX analyzes posture from your webcam, computes multi-axis risk, and guides immediate recovery with
            measurable analytics.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">
              Launch Dashboard
            </Link>
            <Link href="/pricing" className="btn-secondary">
              View Pricing
            </Link>
            {process.env.NEXT_PUBLIC_ENABLE_INVESTOR_DEMO === "true" ? (
              <Link href="/dashboard?demo=1" className="btn-secondary">
                Investor Demo
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Risk classification", value: "LOW to CRITICAL" },
              { icon: Timer, title: "Inference rate", value: "200ms updates" },
              { icon: Waves, title: "Live coaching", value: "Voice + visual cues" }
            ].map((item) => (
              <div key={item.title} className="glass-card p-4">
                <item.icon className="mb-2 h-5 w-5 text-cyan-300" />
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.title}</p>
                <p className="mt-1 text-sm font-semibold text-blue-100">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className="glass-card relative mx-auto w-full max-w-xl overflow-hidden border-blue-300/30 p-5"
        >
          <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
            <span className="rounded-full bg-blue-500/20 px-2 py-1 text-cyan-200">AI posture demo</span>
            <span>Live stream simulation</span>
          </div>
          <div className="relative aspect-video rounded-xl border border-blue-300/20 bg-gradient-to-b from-slate-900 to-blue-950/50 p-4">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(103,160,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(103,160,255,.14)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40" />
            <motion.div
              animate={{ y: [0, -8, 0], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 h-52 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-cyan-300/60 bg-cyan-300/8"
            />
            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "Alignment", value: "89%" },
                { label: "Symmetry", value: "84%" },
                { label: "Fatigue", value: "26%" }
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border border-blue-300/20 bg-slate-900/70 p-2">
                  <p className="text-slate-400">{metric.label}</p>
                  <p className="text-cyan-200">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
