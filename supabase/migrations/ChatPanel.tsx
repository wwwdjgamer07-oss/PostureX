"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Sparkles, Mic } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { createClient } from "@/lib/supabase/client";
import { usePostureChat } from "@/lib/ai/postureCoach";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const supabase = createClient();
  const { messages, input, setInput, handleSend, isTyping } = usePostureChat(supabase);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[400px] border-l border-cyan-500/20 bg-slate-950/80 shadow-2xl backdrop-blur-xl sm:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <Bot className="h-5 w-5 text-white" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">PostureX Coach</h3>
                  <p className="text-xs text-cyan-300">Online • AI Powered</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex h-[calc(100%-140px)] flex-col gap-4 overflow-y-auto p-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Bot className="h-3 w-3" />
                  <span className="animate-pulse">Analyzing...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="absolute bottom-0 left-0 w-full border-t border-white/10 bg-slate-900/50 p-4 backdrop-blur-md">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your posture..."
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-2 rounded-full bg-cyan-500 p-2 text-white transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Insights</span>
                <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> Voice Ready</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}