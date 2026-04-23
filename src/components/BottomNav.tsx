import { NavLink } from "react-router-dom";
import { MessageCircle, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-xl items-center justify-around rounded-t-3xl px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 sm:bottom-3 sm:rounded-3xl"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "group flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl transition-all",
                  isActive ? "bg-gradient-primary text-primary-foreground shadow-bubble" : "bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
