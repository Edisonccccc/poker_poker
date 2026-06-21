import { ProfileList } from "@/features/profiles/ProfileList";

export function ProfilesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
        <p className="text-sm text-slate-500">
          Players, dealers, and hosts. Tap anyone to edit their type.
        </p>
      </div>
      <ProfileList />
    </div>
  );
}
