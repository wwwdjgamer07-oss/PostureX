"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostureChat, type Message } from "@/lib/ai/postureCoach";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { Bot, TrendingUp, Activity, BrainCircuit, ArrowRight, Send, Sparkles, Mic } from "lucide-react";
import Link from "next/link";

export default function AICoachPage() {
  const supabase = createClient();
  const { messages, input, setInput, handleSend, isTyping, context } = usePostureChat(supabase);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Health Coach</h1>
            <p className="mt-2 text-slate-400">Your personal ergonomic intelligence system.</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
            Back to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Embedded Chat Area */}
          <div className="relative flex h-[600px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center opacity-50">
                  <BrainCircuit className="mb-4 h-16 w-16 text-cyan-500" />
                  <p>Start a conversation to analyze your posture.</p>
                </div>
              ) : (
                <div className="space-y-6">
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
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 bg-white/5 p-4">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your posture..."
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 pr-12 text-sm text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-2 rounded-full bg-cyan-500 p-2 text-white transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 text-cyan-300">
                <Activity className="h-5 w-5" />
                <h3 className="font-semibold">Live Vitals</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Weekly Average</p>
                  <p className="text-2xl font-bold text-white">{context?.weeklyAverage || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Streak</p>
                  <p className="text-2xl font-bold text-white">{context?.streak || 0} days</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 text-purple-300">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-semibold">AI Suggestions</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-cyan-500">•</span>
                  Consider increasing monitor height by 2 inches.
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-500">•</span>
                  Take a break every 45 minutes to reset lumbar curve.
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-500">•</span>
                  Your left shoulder tends to drop when fatigued.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}