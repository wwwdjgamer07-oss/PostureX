interface PersonalDetailsProps {
  fullName?: string | null;
  email?: string;
  profile?: { full_name?: string | null; email?: string | null } | null;
}

export function PersonalDetails({ fullName, email, profile }: PersonalDetailsProps) {
  const resolvedName = fullName ?? profile?.full_name ?? "PostureX User";
  const resolvedEmail = email ?? profile?.email ?? "";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Details</h2>
      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
        <p>Name: {resolvedName}</p>
        <p>Email: {resolvedEmail}</p>
      </div>
    </div>
  );
}

export default PersonalDetails;
