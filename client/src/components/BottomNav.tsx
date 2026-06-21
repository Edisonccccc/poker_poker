import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

interface Tab {
  to: string;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
}

const TABS: Tab[] = [
  { to: "/", label: "Home", end: true },
  { to: "/games", label: "Games" },
  { to: "/profiles", label: "Profiles" },
  { to: "/stats", label: "Stats" },
  { to: "/admin", label: "Admin", adminOnly: true },
];

export function BottomNav() {
  const { user } = useAuth();
  const tabs = TABS.filter((t) => !t.adminOnly || user?.role === "admin");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-felt-dark/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `min-h-tap flex-1 py-3 text-center text-xs font-medium ${
                isActive ? "text-white" : "text-white/45"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
