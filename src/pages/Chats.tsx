import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listContacts, getConversationIdForUsers, lastMessageOf, type Contact, type MessageRecord } from "@/lib/storage";
import { importKey, decryptText } from "@/lib/crypto";
import { AvatarOrb } from "@/components/AvatarOrb";
import { Lock, Search, ShieldCheck, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface Row {
  conversationId: string;
  contact: Contact;
  preview: string;
  decrypting: boolean;
  last?: MessageRecord;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

export default function Chats() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const contacts = await listContacts();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const resolved = await Promise.all(
        contacts.map(async (contact): Promise<Row | null> => {
          const convId = await getConversationIdForUsers(user.id, contact.id);
          if (!convId) return null;
          const last = await lastMessageOf(convId);
          if (!last) return { conversationId: convId, contact, preview: "Tap to start a conversation", decrypting: false };
          // We would need the conversation key to decrypt the preview.
          // For simplicity, we'll show a generic preview or fetch the key.
          // In a real implementation, you'd fetch the key and decrypt.
          return {
            conversationId: convId,
            contact,
            preview: last.kind === "text" ? "Encrypted message" : "📷 Encrypted photo",
            decrypting: false,
            last,
          };
        })
      );
      if (!cancelled) setRows(resolved.filter((r): r is Row => r !== null));
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = rows.filter(
    (r) => !query || r.contact.name.toLowerCase().includes(query.toLowerCase()) || r.contact.handle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="px-4">
      <header className="flex items-center justify-between pt-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Cipher</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Chats</h1>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          E2EE on
        </div>
      </header>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search secured chats"
          className="glass h-12 rounded-2xl border-0 pl-11 pr-4 text-sm placeholder:text-muted-foreground"
          aria-label="Search chats"
        />
      </div>

      <ul className="mt-4 space-y-2" role="list">
        {filtered.map(({ conversationId, contact, preview, decrypting, last }) => (
          <li key={conversationId}>
            <button
              onClick={() => navigate(`/chat/${conversationId}`)}
              className="glass group flex w-full items-center gap-3 rounded-3xl p-3 text-left transition-all hover:shadow-bubble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AvatarOrb hue={contact.avatarHue} name={contact.name} size="md" online={contact.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-semibold tracking-tight">{contact.name}</span>
                  {last && <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(last.createdAt)}</span>}
                </div>
                <p className={`flex items-center gap-1.5 truncate text-sm ${decrypting ? "animate-pulse text-muted-foreground" : "text-muted-foreground"}`}>
                  <Lock className="h-3 w-3 shrink-0 text-primary/70" aria-hidden />
                  <span className="truncate">{preview}</span>
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => navigate("/contacts")}
        size="lg"
        className="fixed bottom-28 right-6 z-30 h-14 w-14 rounded-full bg-gradient-primary p-0 shadow-float hover:scale-105 sm:bottom-32"
        aria-label="Start a new chat"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}