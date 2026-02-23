"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

export function AIButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-900/80 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] backdrop-blur-md transition-colors hover:border-cyan-400/60 hover:bg-cyan-950/80 hover:text-cyan-200 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
      >
        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20 duration-3000" />
        <Bot className="relative h-7 w-7" />
      </motion.button>

      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}