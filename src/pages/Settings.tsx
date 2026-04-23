import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTheme, PRESETS, type ThemePalette } from "@/theme/ThemeProvider";
import { useSession } from "@/hooks/useSession";
import { AvatarOrb } from "@/components/AvatarOrb";
import { LogOut, Moon, Palette, RotateCcw, ShieldCheck, Sun, Contrast } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { palette, setPalette, applyPreset, reset } = useTheme();
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  const update = (k: keyof ThemePalette, v: number) => setPalette({ [k]: v } as Partial<ThemePalette>);

  return (
    <div className="px-4">
      <header className="pt-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">You</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      </header>

      {user && (
        <section className="glass mt-5 flex items-center gap-3 rounded-3xl p-4">
          <AvatarOrb hue={user.avatarHue} name={user.displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold tracking-tight">{user.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.handle}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Identity stored locally
            </p>
          </div>
        </section>
      )}

      <section className="glass mt-4 rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display font-semibold">Theme presets</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            <RotateCcw className="mr-1 h-3 w-3" /> Reset
          </Button>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hidden">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.name)}
              className="group relative h-20 min-w-[6rem] shrink-0 overflow-hidden rounded-2xl border border-glass-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Apply ${p.name} theme`}
            >
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, hsl(${p.palette.primaryH} ${p.palette.primaryS}% ${p.palette.primaryL}%), hsl(${p.palette.accentH} ${p.palette.accentS}% ${p.palette.accentL}%))`,
                }}
              />
              <span className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1 text-center text-[11px] font-medium backdrop-blur">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass mt-4 space-y-5 rounded-3xl p-5">
        <h2 className="font-display font-semibold">Color editor</h2>

        <ColorRow label="Primary action" h={palette.primaryH} s={palette.primaryS} l={palette.primaryL}
          onH={(v) => update("primaryH", v)} onS={(v) => update("primaryS", v)} onL={(v) => update("primaryL", v)} />

        <ColorRow label="Accent tint" h={palette.accentH} s={palette.accentS} l={palette.accentL}
          onH={(v) => update("accentH", v)} onS={(v) => update("accentS", v)} onL={(v) => update("accentL", v)} />

        <ColorRow label="Sent bubble" h={palette.bubbleSentH} s={palette.bubbleSentS} l={palette.bubbleSentL}
          onH={(v) => update("bubbleSentH", v)} onS={(v) => update("bubbleSentS", v)} onL={(v) => update("bubbleSentL", v)} />

        <ColorRow label="Received bubble" h={palette.bubbleReceivedH} s={palette.bubbleReceivedS} l={palette.bubbleReceivedL}
          onH={(v) => update("bubbleReceivedH", v)} onS={(v) => update("bubbleReceivedS", v)} onL={(v) => update("bubbleReceivedL", v)} />

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Background hue</Label>
          <Slider
            value={[palette.bgH]}
            onValueChange={([v]) => update("bgH", v)}
            min={0} max={360} step={1}
            className="mt-2"
            aria-label="Background hue"
          />
        </div>

        <div className="mt-2 flex justify-center gap-2 rounded-2xl bg-secondary p-3">
          <div className="bg-bubble-received text-bubble-received-foreground rounded-3xl rounded-bl-md px-4 py-2 text-sm shadow-bubble">
            Hi there
          </div>
          <div
            className="bg-bubble-sent text-bubble-sent-foreground rounded-3xl rounded-br-md px-4 py-2 text-sm shadow-bubble"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            Looks great ✨
          </div>
        </div>
      </section>

      <section className="glass mt-4 space-y-3 rounded-3xl p-5">
        <h2 className="font-display font-semibold">Appearance</h2>

        <Toggle
          icon={palette.mode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          label="Dark mode"
          description="Switch the canvas to a darker base."
          checked={palette.mode === "dark"}
          onCheckedChange={(v) => setPalette({ mode: v ? "dark" : "light" })}
        />

        <Toggle
          icon={<Contrast className="h-4 w-4" />}
          label="High contrast (WCAG AA)"
          description="Boosts borders and clamps bubble colors for legibility."
          checked={palette.highContrast}
          onCheckedChange={(v) => setPalette({ highContrast: v })}
        />
      </section>

      <Button
        variant="ghost"
        className="mt-6 w-full justify-start gap-3 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={async () => { await signOut(); navigate("/login"); }}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Cipher · AES-GCM 256 · Local-only demo
      </p>
    </div>
  );
}

function ColorRow({
  label, h, s, l, onH, onS, onL,
}: {
  label: string; h: number; s: number; l: number;
  onH: (v: number) => void; onS: (v: number) => void; onL: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span
          className="h-6 w-12 rounded-lg border border-glass-border"
          style={{ background: `hsl(${h} ${s}% ${l}%)` }}
          aria-hidden
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SliderRow name="Hue" value={h} min={0} max={360} onChange={onH} />
        <SliderRow name="Sat" value={s} min={0} max={100} onChange={onS} />
        <SliderRow name="Light" value={l} min={5} max={95} onChange={onL} />
      </div>
    </div>
  );
}

function SliderRow({ name, value, min, max, onChange }: { name: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{name}</span>
        <span>{Math.round(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} className="mt-1" aria-label={name} />
    </div>
  );
}

function Toggle({ icon, label, description, checked, onCheckedChange }: { icon: React.ReactNode; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </label>
  );
}
