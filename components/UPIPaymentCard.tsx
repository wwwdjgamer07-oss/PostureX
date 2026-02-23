"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { createPayment } from "@/lib/createPayment";

const PLAN_OPTIONS = [
  { label: "Basic", value: "BASIC", amount: 1 },
  { label: "Pro", value: "PRO", amount: 2 },
  { label: "Pro Weekly", value: "PRO_WEEKLY", amount: 1 }
] as const;

type PaymentPlan = (typeof PLAN_OPTIONS)[number]["value"];

interface UPIPaymentCardProps {
  defaultPlan?: PaymentPlan;
}

export function UPIPaymentCard({ defaultPlan = "BASIC" }: UPIPaymentCardProps) {
  const [plan, setPlan] = useState<PaymentPlan>(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => PLAN_OPTIONS.find((item) => item.value === plan) ?? PLAN_OPTIONS[0], [plan]);

  const handlePaid = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await createPayment({
        plan: selected.value.toLowerCase() as "basic" | "pro" | "pro_weekly",
        amountInr: selected.amount as 1 | 2
      });
      setMessage("Payment submitted for verification. Status: pending.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="rounded-2xl border border-slate-500/25 bg-slate-900/55 p-5">
        <h3 className="text-lg font-semibold text-white">UPI payment checkout</h3>
        <p className="mt-1 text-sm text-slate-400">Scan with GPay, PhonePe, Paytm, or Samsung Wallet.</p>

        <label className="mt-5 block text-sm text-slate-300">
          Select plan
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as PaymentPlan)}
            className="mt-1 w-full rounded-xl border border-slate-500/40 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - INR {option.amount} {option.value === "PRO_WEEKLY" ? "/ week" : "/ month"}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-3 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100">
          Amount: INR {selected.amount}
        </p>

        <div className="mt-4 rounded-xl border border-slate-500/30 bg-slate-900/60 p-3 text-xs text-slate-400">
          <p>
            UPI ID: <span className="text-cyan-100">deepthan07@pingpay</span>
          </p>
          <p className="mt-1">Supported apps: GPay, PhonePe, Paytm, Samsung Wallet</p>
        </div>

        {error ? <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
        {message ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 p-3">
              <div className="flex items-center gap-2">
                <div className="relative grid h-10 w-10 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/20">
                  <span className="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-emerald-400/25" />
                  <CheckCircle2 className="relative h-5 w-5 text-emerald-300" />
                </div>
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  Payment submitted
                </p>
              </div>
            </div>
            <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          </div>
        ) : null}

        <button type="button" onClick={handlePaid} disabled={loading} className="px-button mt-4 w-full disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          I have paid
        </button>
      </div>

      <div className="rounded-2xl border border-cyan-300/30 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Scan QR</p>
        <div className="mt-3 rounded-2xl border border-cyan-300/25 bg-white p-3">
          <Image src="/payment/upi-qr.png" alt="UPI QR code" width={260} height={260} className="h-auto w-full" />
        </div>
      </div>
    </div>
  );
}
