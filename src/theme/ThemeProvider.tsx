import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMeta, setMeta } from "@/lib/storage";

export interface ThemePalette {
  primaryH: number;
  primaryS: number;
  primaryL: number;
  accentH: number;
  accentS: number;
  accentL: number;
  bubbleSentH: number;
  bubbleSentS: number;
  bubbleSentL: number;
  bubbleReceivedH: number;
  bubbleReceivedS: number;
  bubbleReceivedL: number;
  bgH: number;
  bgS: number;
  mode: "light" | "dark";
  highContrast: boolean;
}

export const DEFAULT_PALETTE: ThemePalette = {
  primaryH: 268, primaryS: 88, primaryL: 62,
  accentH: 192, accentS: 95, accentL: 58,
  bubbleSentH: 268, bubbleSentS: 88, bubbleSentL: 62,
  bubbleReceivedH: 240, bubbleReceivedS: 25, bubbleReceivedL: 98,
  bgH: 240, bgS: 30,
  mode: "light",
  highContrast: false,
};

export const PRESETS: { name: string; palette: ThemePalette }[] = [
  { name: "Aurora", palette: DEFAULT_PALETTE },
  { name: "Sunset", palette: { ...DEFAULT_PALETTE, primaryH: 14, primaryS: 92, primaryL: 60, accentH: 340, accentS: 90, accentL: 65, bubbleSentH: 14, bubbleSentS: 92, bubbleSentL: 60, bgH: 24, bgS: 60 } },
  { name: "Mint", palette: { ...DEFAULT_PALETTE, primaryH: 158, primaryS: 76, primaryL: 45, accentH: 188, accentS: 80, accentL: 52, bubbleSentH: 158, bubbleSentS: 76, bubbleSentL: 45, bgH: 168, bgS: 40 } },
  { name: "Midnight", palette: { ...DEFAULT_PALETTE, primaryH: 230, primaryS: 90, primaryL: 65, accentH: 280, accentS: 90, accentL: 70, bubbleSentH: 230, bubbleSentS: 90, bubbleSentL: 60, bubbleReceivedH: 240, bubbleReceivedS: 20, bubbleReceivedL: 14, bgH: 240, bgS: 30, mode: "dark" } },
  { name: "Acid", palette: { ...DEFAULT_PALETTE, primaryH: 88, primaryS: 90, primaryL: 50, accentH: 320, accentS: 95, accentL: 60, bubbleSentH: 88, bubbleSentS: 90, bubbleSentL: 50, bgH: 80, bgS: 40 } },
];

interface ThemeContextValue {
  palette: ThemePalette;
  setPalette: (p: Partial<ThemePalette>) => void;
  applyPreset: (name: string) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDocument(p: ThemePalette) {
  const root = document.documentElement;
  root.classList.toggle("dark", p.mode === "dark");
  root.classList.toggle("high-contrast", p.highContrast);

  // Auto-bump bubble contrast when high contrast is on
  const sentL = p.highContrast ? Math.min(p.bubbleSentL, 40) : p.bubbleSentL;
  const recvL = p.highContrast
    ? p.mode === "dark" ? Math.min(p.bubbleReceivedL, 18) : Math.max(p.bubbleReceivedL, 96)
    : p.bubbleReceivedL;

  root.style.setProperty("--primary", `${p.primaryH} ${p.primaryS}% ${p.primaryL}%`);
  root.style.setProperty("--primary-glow", `${p.primaryH} ${p.primaryS}% ${Math.min(p.primaryL + 14, 88)}%`);
  root.style.setProperty("--primary-foreground", "0 0% 100%");
  root.style.setProperty("--ring", `${p.primaryH} ${p.primaryS}% ${p.primaryL}%`);

  root.style.setProperty("--accent", `${p.accentH} ${p.accentS}% ${p.accentL}%`);
  root.style.setProperty("--accent-foreground", p.mode === "dark" ? "240 15% 96%" : "240 25% 10%");

  root.style.setProperty("--bubble-sent", `${p.bubbleSentH} ${p.bubbleSentS}% ${sentL}%`);
  root.style.setProperty("--bubble-sent-foreground", "0 0% 100%");
  root.style.setProperty("--bubble-received", `${p.bubbleReceivedH} ${p.bubbleReceivedS}% ${recvL}%`);
  root.style.setProperty("--bubble-received-foreground", recvL > 50 ? "240 25% 12%" : "240 15% 96%");

  // Mesh hues follow palette
  root.style.setProperty("--mesh-1", `${p.primaryH} 95% ${p.mode === "dark" ? 35 : 75}%`);
  root.style.setProperty("--mesh-2", `${p.accentH} 95% ${p.mode === "dark" ? 30 : 70}%`);
  root.style.setProperty("--mesh-3", `${(p.primaryH + 60) % 360} 95% ${p.mode === "dark" ? 30 : 75}%`);
  root.style.setProperty("--mesh-4", `${(p.accentH + 40) % 360} 95% ${p.mode === "dark" ? 30 : 75}%`);

  // Background tint follows bgH/bgS
  if (p.mode === "dark") {
    root.style.setProperty("--background", `${p.bgH} ${p.bgS}% 6%`);
  } else {
    root.style.setProperty("--background", `${p.bgH} ${p.bgS}% 98%`);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<ThemePalette>(DEFAULT_PALETTE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMeta<ThemePalette>("theme").then((stored) => {
      if (!cancelled) {
        const next = stored ? { ...DEFAULT_PALETTE, ...stored } : DEFAULT_PALETTE;
        setPaletteState(next);
        applyToDocument(next);
        setHydrated(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hydrated) {
      applyToDocument(palette);
      setMeta("theme", palette);
    }
  }, [palette, hydrated]);

  const setPalette = useCallback((p: Partial<ThemePalette>) => {
    setPaletteState((prev) => ({ ...prev, ...p }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    const found = PRESETS.find((p) => p.name === name);
    if (found) setPaletteState({ ...found.palette });
  }, []);

  const reset = useCallback(() => setPaletteState(DEFAULT_PALETTE), []);

  const value = useMemo(() => ({ palette, setPalette, applyPreset, reset }), [palette, setPalette, applyPreset, reset]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
