"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  currentAvatar?: string;
  isPro: boolean;
}

export function AvatarEditor({ onClose, currentAvatar, isPro }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) throw new Error("Authentication required to upload avatar.");
      const { publicUrl } = await uploadAvatar(file, { supabase, userId: user.id });

      setPreview(publicUrl);
      setSuccess("Avatar updated successfully!");
      startTransition(() => router.refresh());
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const generateAIAvatar = async () => {
    if (!isPro) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mock AI generation delay
      await new Promise(r => setTimeout(r, 2000));
      const newAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=MrX";
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase.from("users").update({ avatar_url: newAvatar }).eq("id", user.id);
        if (updateError) throw updateError;
      }

      setPreview(newAvatar);
      setSuccess("AI Avatar generated and saved!");
      router.refresh();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate AI avatar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Customize Avatar</h2>
        <p className="text-sm text-slate-500 mb-8">Choose how you appear in the posture community.</p>

        {/* Toast Notifications */}
        <div className="absolute top-24 left-0 right-0 px-8 z-20 pointer-events-none">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100 dark:border-slate-800 shadow-inner relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            )}
            <img 
              src={preview || "https://api.dicebear.com/7.x/initials/svg?seed=User"} 
              alt="Avatar preview" 
              className="w-full h-full object-cover" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors"
            >
              <Upload className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Photo</span>
            </button>
            
            <button 
              onClick={generateAIAvatar}
              disabled={!isPro}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed transition-colors",
                isPro ? "border-amber-200 hover:border-amber-400" : "border-slate-100 opacity-50 cursor-not-allowed"
              )}
            >
              <Sparkles className="w-6 h-6 text-amber-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">AI Generate</span>
              {!isPro && <span className="text-[8px] uppercase text-amber-600 font-bold">Pro Only</span>}
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload} 
          />

          <button onClick={onClose} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
