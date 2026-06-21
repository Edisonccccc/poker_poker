import { useState } from "react";
import { ProfileList } from "@/features/profiles/ProfileList";
import type { ProfileKind } from "@/features/profiles/api";

export function ProfilesPage() {
  const [tab, setTab] = useState<ProfileKind>("players");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Profiles</h1>

      <div className="flex rounded-xl bg-white/5 p-1">
        {(["players", "dealers"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`min-h-tap flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
              tab === k ? "bg-felt-light text-white" : "text-white/55"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <ProfileList key={tab} kind={tab} />
    </div>
  );
}
