"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function AnimatedLogo() {
  return (
    <div className="relative isolate will-change-transform">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.4, ease }}
        style={{ transform: "translate3d(0,0,0)" }}
        className="relative rounded-3xl border border-cyan-300/30 bg-slate-900/45 p-5 shadow-[0_0_45px_rgba(0,200,255,0.32)] backdrop-blur-xl"
      >
        <Image src="/logo.png" alt="MRX AI logo" width={200} height={56} priority className="h-14 w-auto object-contain" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.7, 0], scale: [0.8, 1.25, 1.45] }}
        transition={{ duration: 1.6, delay: 0.35, ease }}
        className="absolute inset-0 -z-10 rounded-3xl"
        style={{ background: "radial-gradient(circle, rgba(0,200,255,0.4) 0%, transparent 70%)", filter: "blur(22px)" }}
      />
    </div>
  );
}
