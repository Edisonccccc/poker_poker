import { NavLink } from "react-router-dom";
import { Dice5, Users, BarChart3, Shield, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
}

const TABS: Tab[] = [
  { to: "/games", label: "Games", icon: Dice5 },
  { to: "/profiles", label: "People", icon: Users },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function BottomNav() {
  const { user } = useAuth();
  const tabs = TABS.filter((t) => !t.adminOnly || user?.role === "admin");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-felt-dark/90 backdrop-blur-xl">
      <div
        className="mx-auto flex max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? "text-emerald-400" : "text-white/45"
              }`
            }
          >
            <Icon size={22} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
