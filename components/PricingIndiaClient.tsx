"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PLAN_FEATURES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { PlanTier } from "@/lib/types";

type PaidPlan = "BASIC" | "PRO" | "PRO_WEEKLY";

interface PricingIndiaClientProps {
  currentPlan: PlanTier;
  userId: string | null;
}

interface MembershipSnapshot {
  subscriptionActive: boolean;
  planExpiry: string | null;
}

const plans: Array<{
  id: "FREE" | "BASIC" | "PRO" | "PRO_WEEKLY";
  tier: PlanTier;
  label: string;
  priceText: string;
  description: string;
  paidPlan?: PaidPlan;
  rewardText?: string;
  featured?: boolean;
}> = [
  {
    id: "FREE",
    tier: "FREE",
    label: "Free",
    priceText: "\u20b90",
    description: "For trial usage and basic posture tracking."
  },
  {
    id: "BASIC",
    tier: "BASIC",
    label: "Basic",
    priceText: "\u20b91 / month",
    paidPlan: "BASIC",
    description: "For consistent personal posture improvement."
  },
  {
    id: "PRO",
    tier: "PRO",
    label: "Pro",
    priceText: "\u20b92 / month",
    paidPlan: "PRO",
    description: "For advanced AI analytics and team-level workflows.",
    rewardText: "Bonus: 80 PX Coins + 1 Purple Gem",
    featured: true
  },
  {
    id: "PRO_WEEKLY",
    tier: "PRO",
    label: "Pro Weekly",
    priceText: "\u20b91 / week",
    paidPlan: "PRO_WEEKLY",
    description: "Weekly Pro membership for short bursts and flexible usage.",
    rewardText: "Bonus: 20 PX Coins + 1 Blue Gem"
  }
];

const paidPlanMeta: Record<PaidPlan, { amount: 1 | 2; label: string; intervalLabel: string }> = {
  BASIC: { amount: 1, label: "Basic", intervalLabel: "monthly" },
  PRO: { amount: 2, label: "Pro", intervalLabel: "monthly" },
  PRO_WEEKLY: { amount: 1, label: "Pro Weekly", intervalLabel: "weekly" },
};

const queryPlanMap: Record<string, PaidPlan> = {
  PRO: "PRO",
  PRO_WEEKLY: "PRO_WEEKLY",
  BASIC: "BASIC",
  "PRO-WEEKLY": "PRO_WEEKLY",
  WEEKLY_PRO: "PRO_WEEKLY",
  WEEKLY: "PRO_WEEKLY"
};

const paidPlanFeaturesMap: Record<PaidPlan, string[]> = {
  BASIC: PLAN_FEATURES.BASIC,
  PRO: PLAN_FEATURES.PRO,
  PRO_WEEKLY: PLAN_FEATURES.PRO
};

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

async function loadRazorpayScript() {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay="checkout"]');
  if (existingScript) {
    return new Promise<boolean>((resolve) => {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.dataset.razorpay = "checkout";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PricingIndiaClient({ currentPlan, userId }: PricingIndiaClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromQuery = String(searchParams?.get("plan") ?? "").toUpperCase();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(queryPlanMap[planFromQuery] ?? "BASIC");
  const [activePlan, setActivePlan] = useState<PlanTier>(currentPlan);
  const [sessionUserId, setSessionUserId] = useState<string | null>(userId);
  const [activatingFree, setActivatingFree] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<PaidPlan | null>(null);
  const [paymentCelebration, setPaymentCelebration] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipSnapshot>({ subscriptionActive: false, planExpiry: null });

  const isProcessing = processingPlan !== null;
  const isActiveMember =
    membership.subscriptionActive &&
    Boolean(membership.planExpiry && new Date(membership.planExpiry).getTime() > Date.now());
  const basicToProUpgradeEligible = isActiveMember && activePlan === "BASIC";

  useEffect(() => {
    setActivePlan(currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    if (sessionUserId) return;
    let active = true;

    async function loadSessionUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser }
        } = await supabase.auth.getUser();
        if (!active) return;
        setSessionUserId(authUser?.id ?? null);
      } catch {
        if (!active) return;
        setSessionUserId(null);
      }
    }

    void loadSessionUser();
    return () => {
      active = false;
    };
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`pricing-plan-${sessionUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${sessionUserId}`
        },
        (payload) => {
          const nextPlan = String((payload.new as { plan_tier?: string })?.plan_tier ?? "").toUpperCase();
          if (nextPlan === "FREE" || nextPlan === "BASIC" || nextPlan === "PRO") {
            setActivePlan(nextPlan as PlanTier);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    let active = true;

    async function loadMembership() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("subscription_active,plan_end")
          .eq("id", sessionUserId)
          .maybeSingle();
        if (!active) return;
        setMembership({
          subscriptionActive: Boolean((data as { subscription_active?: boolean | null } | null)?.subscription_active),
          planExpiry: (data as { plan_end?: string | null } | null)?.plan_end ?? null
        });
      } catch {
        if (!active) return;
        setMembership({ subscriptionActive: false, planExpiry: null });
      }
    }

    void loadMembership();
    return () => {
      active = false;
    };
  }, [sessionUserId]);

  useEffect(() => {
    void loadRazorpayScript();
  }, []);

  async function activateFreePlan() {
    setActivatingFree(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/plans/activate-free", { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to activate free plan.");
      }
      setActivePlan("FREE");
      setMessage(payload.message || "Free plan activated instantly.");
      toast.success("Free plan activated");
      router.refresh();
    } catch (errorValue) {
      const messageText = errorValue instanceof Error ? errorValue.message : "Failed to activate free plan.";
      setError(messageText);
      toast.error(messageText);
    } finally {
      setActivatingFree(false);
    }
  }

  async function verifyPayment(response: RazorpaySuccessResponse, plan: PaidPlan, currentUserId: string) {
    const verifyResponse = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...response,
        userId: currentUserId,
        planId: plan
      })
    });

    const payload = (await verifyResponse.json()) as { success?: boolean; plan?: PlanTier; error?: string };
    if (!verifyResponse.ok || !payload.success || !payload.plan) {
      throw new Error(payload.error || "Payment verification failed.");
    }

    const planMeta = paidPlanMeta[plan];
    const activatedLabel = `${planMeta.label}${planMeta.intervalLabel === "weekly" ? " (Weekly)" : ""}`;
    setActivePlan(payload.plan);
    router.push("/dashboard");
    setPaymentCelebration(true);
    setMessage(`${activatedLabel} activated instantly.`);
    setError(null);
    window.dispatchEvent(new Event("posturex-plan-updated"));
    toast.success(`${activatedLabel} activated`);
    router.refresh();
  }

  async function startRazorpayCheckout(plan: PaidPlan) {
    if (!sessionUserId) {
      const err = "Please sign in to continue with payment.";
      setError(err);
      toast.error(err);
      return;
    }

    const allowBasicToProUpgrade = basicToProUpgradeEligible && plan === "PRO";
    if (isActiveMember && !allowBasicToProUpgrade) {
      const expiryText = membership.planExpiry ? new Date(membership.planExpiry).toLocaleString() : "active";
      setMessage(`Your membership is already active until ${expiryText}. Redirecting to dashboard...`);
      router.push("/dashboard");
      return;
    }

    setProcessingPlan(plan);
    setError(null);
    setMessage(null);
    setPaymentCelebration(false);
    setSelectedPlan(plan);

    try {
      const amount = allowBasicToProUpgrade ? 1 : paidPlanMeta[plan].amount;
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan,
          amount,
          userId: sessionUserId
        })
      });

      const orderPayload = (await orderResponse.json()) as { orderId?: string; keyId?: string; error?: string };
      if (!orderResponse.ok || !orderPayload.orderId) {
        throw new Error(orderPayload.error || "Failed to create payment order.");
      }
      const key = orderPayload.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error("Razorpay key is missing. Set RAZORPAY_KEY_ID on server or NEXT_PUBLIC_RAZORPAY_KEY_ID.");
      }

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout failed to load.");
      }

      const checkout = new window.Razorpay({
        key,
        order_id: orderPayload.orderId,
        amount: amount * 100,
        currency: "INR",
        name: "PostureX",
        description: `${paidPlanMeta[plan].label} Subscription`,
        theme: { color: "#06b6d4" },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          }
        },
        handler: (paymentResponse) => {
          void (async () => {
            try {
              await verifyPayment(paymentResponse, plan, sessionUserId);
            } catch (errorValue) {
              const messageText = errorValue instanceof Error ? errorValue.message : "Payment verification failed.";
              setError(messageText);
              toast.error(messageText);
            } finally {
              setProcessingPlan(null);
            }
          })();
        }
      });

      checkout.open();
    } catch (errorValue) {
      const messageText = errorValue instanceof Error ? errorValue.message : "Failed to start Razorpay checkout.";
      setError(messageText);
      toast.error(messageText);
      setProcessingPlan(null);
    }
  }

  return (
    <main className="px-shell space-y-6">
      <header className="px-panel p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Simple India subscriptions</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Current plan: <span className="font-semibold text-cyan-700 dark:text-cyan-100">{activePlan}</span>
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === activePlan;
          const isSelected = Boolean(plan.paidPlan && selectedPlan === plan.paidPlan);
          const allowBasicToProUpgrade = Boolean(plan.paidPlan === "PRO" && basicToProUpgradeEligible);
          const expiryLabel = membership.planExpiry ? new Date(membership.planExpiry).toLocaleDateString() : null;
          return (
            <article
              key={plan.id}
              className={`px-panel p-6 ${plan.featured ? "border-cyan-300/45 shadow-[0_0_35px_rgba(34,211,238,0.18)]" : ""} ${
                isSelected ? "ring-1 ring-cyan-300/60" : ""
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{plan.label}</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{plan.priceText}</h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{plan.description}</p>
              {plan.rewardText ? <p className="mt-2 text-xs font-semibold text-cyan-700 dark:text-cyan-200">{plan.rewardText}</p> : null}

              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(plan.paidPlan ? paidPlanFeaturesMap[plan.paidPlan] : PLAN_FEATURES.FREE).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.tier === "FREE" ? (
                  <button
                    type="button"
                    disabled={isCurrent || activatingFree}
                    onClick={() => {
                      void activateFreePlan();
                    }}
                    className="px-button w-full disabled:opacity-60"
                  >
                    {isCurrent ? "Current Plan" : activatingFree ? "Activating..." : "Activate Free"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessing || (isCurrent && isActiveMember && !allowBasicToProUpgrade)}
                    onClick={() => {
                      if (isActiveMember && !allowBasicToProUpgrade) {
                        router.push("/dashboard");
                        return;
                      }
                      if (plan.paidPlan) {
                        void startRazorpayCheckout(plan.paidPlan);
                      }
                    }}
                    className="px-button w-full disabled:opacity-60"
                  >
                    {isProcessing && plan.paidPlan && selectedPlan === plan.paidPlan ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : isCurrent && isActiveMember && expiryLabel ? (
                      `Active till ${expiryLabel}`
                    ) : isCurrent && isActiveMember ? (
                      "Plan Active"
                    ) : allowBasicToProUpgrade ? (
                      "Upgrade to Pro - \u20b91"
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Select ${plan.label}`
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="px-panel p-5 text-sm text-slate-700 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white">Payment flow</p>
        <p className="mt-2">1. Select Basic, Pro monthly, or Pro weekly.</p>
        <p>2. Razorpay checkout opens securely.</p>
        <p>3. Complete payment in Razorpay.</p>
        <p>4. Signature is verified server-side.</p>
        <p>5. Plan activates instantly and features unlock immediately.</p>
      </section>

      {paymentCelebration ? (
        <section className="rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 p-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/20">
              <span className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-emerald-400/25" />
              <CheckCircle2 className="relative h-7 w-7 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Payment confirmed
              </p>
              <p className="text-xs text-slate-200">Your subscription is active and features are unlocked.</p>
            </div>
          </div>
        </section>
      ) : null}
      {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
    </main>
  );
}
