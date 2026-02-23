import { UserCircle2 } from "lucide-react";

interface ProfileHeaderProps {
  fullName?: string | null;
  email?: string;
  avatarUrl?: string | null;
  planTier?: string;
  user?: { email?: string | null } | null;
  profile?: { full_name?: string | null; avatar_url?: string | null } | null;
  plan?: string;
}

export function ProfileHeader({
  fullName,
  email,
  avatarUrl,
  planTier,
  user,
  profile,
  plan
}: ProfileHeaderProps) {
  const resolvedName = fullName ?? profile?.full_name ?? "PostureX User";
  const resolvedEmail = email ?? user?.email ?? "";
  const resolvedAvatar = avatarUrl ?? profile?.avatar_url ?? null;
  const resolvedPlan = planTier ?? plan ?? "FREE";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-4">
        {resolvedAvatar ? (
          <img src={resolvedAvatar} alt={resolvedName} className="h-16 w-16 rounded-full border border-white/20 object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-slate-800/80 text-white">
            <UserCircle2 className="h-8 w-8" />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{resolvedName}</h1>
          <p className="text-sm text-slate-700 dark:text-slate-300">{resolvedEmail}</p>
          <p className="inline-flex rounded-md border border-white/20 bg-sky-600/20 px-2 py-1 text-xs font-medium text-sky-100">
            Plan: {resolvedPlan}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
