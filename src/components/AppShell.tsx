import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col">
      <main className="flex-1 pb-28 pt-2">{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
