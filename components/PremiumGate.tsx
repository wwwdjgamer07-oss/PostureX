import Link from "next/link";

interface Props {
  canAccess: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PremiumGate({ canAccess, title, description, children }: Props) {
  if (canAccess) return <>{children}</>;

  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      <div className="mt-4">
        <Link href="/pricing" className="btn-primary inline-block">
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
