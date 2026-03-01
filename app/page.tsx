import { BarChart3, Cpu, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { PostureXHeroAnimation } from "@/components/PostureXHeroAnimation";
import { StartFreeButton } from "@/components/StartFreeButton";
import { PAID_PLAN_PRICES_INR, formatInr } from "@/lib/pricing";

const featureItems = [
  {
    title: "AI Tracking Engine",
    description: "Live skeletal inference with alignment, stability, and fatigue profiling at session speed.",
    icon: Cpu
  },
  {
    title: "Risk Alerts",
    description: "Context-aware risk warnings trigger before severe strain accumulates.",
    icon: ShieldAlert
  },
  {
    title: "Performance Analytics",
    description: "Session trends, streak intelligence, and score drift diagnostics for daily optimization.",
    icon: BarChart3
  }
];

const pricing = [
  { name: "Free", price: "₹0", description: "For limited sessions and basic analytics.", cta: "Start Free", href: "/pricing", startFree: true },
  {
    name: "Basic",
    price: `₹${formatInr(PAID_PLAN_PRICES_INR.BASIC)} / month`,
    description: "Unlimited sessions with alerts and PDF reports.",
    cta: "Choose Basic",
    href: "/pricing?plan=basic"
  },
  {
    name: "Pro",
    price: `₹${formatInr(PAID_PLAN_PRICES_INR.PRO)} / month`,
    description: "Advanced AI insights, trends, and team dashboard.",
    cta: "Choose Pro",
    featured: true,
    href: "/pricing?plan=pro"
  },
  {
    name: "Pro Weekly",
    price: `₹${formatInr(PAID_PLAN_PRICES_INR.PRO_WEEKLY)} / week`,
    description: "Weekly Pro membership with 20 PX Coins + 1 Blue Gem bonus.",
    cta: "Choose Pro Weekly",
    href: "/pricing?plan=pro_weekly"
  }
];

export default function HomePage() {
  return (
    <main className="px-shell space-y-12 pb-12">
      <section className="relative overflow-hidden">
        <AmbientBackground />
        <div className="relative z-10">
          <PostureXHeroAnimation />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="px-panel px-reveal px-hover-lift group p-6 hover:border-cyan-300/40 hover:shadow-[0_0_35px_rgba(34,211,238,0.16)]" style={{ animationDelay: `${220 + index * 90}ms` }}>
              <Icon className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="space-y-5 px-reveal" style={{ animationDelay: "420ms" }}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Pricing</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Choose a plan built for performance-driven posture operations.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {pricing.map((plan, index) => (
            <article
              key={plan.name}
              className={`px-panel px-reveal px-hover-lift p-6 ${plan.featured ? "border-cyan-300/45 shadow-[0_0_45px_rgba(34,211,238,0.16)]" : ""}`}
              style={{ animationDelay: `${500 + index * 90}ms` }}
            >
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{plan.name}</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-white">{plan.price}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
              {plan.startFree ? (
                <StartFreeButton className="px-button mt-6 inline-flex w-full justify-center">{plan.cta}</StartFreeButton>
              ) : (
                <Link href={plan.href} className="px-button mt-6 inline-flex w-full justify-center">
                  {plan.cta}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="px-panel px-reveal flex flex-col gap-2 p-6 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "740ms" }}>
        <p>PostureX posture intelligence platform</p>
        <p>Built for high-performance teams and individuals. Powered by Xember.co</p>
      </footer>
    </main>
  );
}
