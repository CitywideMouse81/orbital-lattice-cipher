import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Lock, Send, Shield, Check, CheckCheck, Loader2, X } from "lucide-react";
import { AvatarOrb } from "@/components/AvatarOrb";
import { Button } from "@/components/ui/button";
import { addMessage, getConversationDetails, listMessages, updateMessage, type MessageRecord } from "@/lib/storage";
import { decryptBytes, decryptText, encryptBytes, encryptText, fingerprint, importKey } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

interface DecryptedView {
  record: MessageRecord;
  text?: string;
  imageUrl?: string;
  caption?: string;
  state: "decrypting" | "ready" | "error";
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useSession();
  const [details, setDetails] = useState<{ contact: any; keyJwk: JsonWebKey } | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<DecryptedView[]>([]);
  const [input, setInput] = useState("");
  const [draftImage, setDraftImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const processedMessageIds = useRef<Set<string>>(new Set());

  // Load conversation details and messages
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    (async () => {
      const convDetails = await getConversationDetails(conversationId);
      if (!convDetails || cancelled) return;
      setDetails({ contact: convDetails.contact, keyJwk: convDetails.keyJwk });
      const key = await importKey(convDetails.keyJwk);
      if (cancelled) return;
      setCryptoKey(key);
      const records = await listMessages(conversationId);
      records.forEach(r => processedMessageIds.current.add(r.id));
      const placeholder: DecryptedView[] = records.map((r) => ({ record: r, state: "decrypting" }));
      setItems(placeholder);
      const decrypted = await Promise.all(records.map((r) => decryptOne(r, key)));
      if (!cancelled) setItems(decrypted);
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !cryptoKey || !currentUser?.id) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          if (processedMessageIds.current.has(newMsg.id)) return;
          if (newMsg.sender_id === currentUser.id) {
            processedMessageIds.current.add(newMsg.id);
            return;
          }

          const record: MessageRecord = {
            id: newMsg.id,
            conversationId: newMsg.conversation_id,
            sender: 'them',
            kind: newMsg.kind,
            ciphertext: newMsg.ciphertext,
            imageMime: newMsg.image_mime,
            caption: newMsg.caption_ciphertext,
            status: newMsg.status,
            createdAt: new Date(newMsg.created_at).getTime(),
          };

          processedMessageIds.current.add(record.id);
          const decrypted = await decryptOne(record, cryptoKey);
          setItems((prev) => [...prev, decrypted]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, cryptoKey, currentUser?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  async function decryptOne(r: MessageRecord, key: CryptoKey): Promise<DecryptedView> {
    try {
      if (r.kind === "text") {
        const text = await decryptText(key, r.ciphertext);
        return { record: r, text, state: "ready" };
      } else {
        const buf = await decryptBytes(key, r.ciphertext);
        const blob = new Blob([buf], { type: r.imageMime || "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const caption = r.caption ? await decryptText(key, r.caption) : undefined;
        return { record: r, imageUrl: url, caption, state: "ready" };
      }
    } catch {
      return { record: r, state: "error" };
    }
  }

  const fp = useMemo(() => (details ? fingerprint(details.keyJwk) : ""), [details]);

  async function sendText() {
    if (!cryptoKey || !conversationId || !input.trim()) return;
    const text = input.trim();
    setInput("");
    const ct = await encryptText(cryptoKey, text);
    const rec: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId,
      sender: "me",
      kind: "text",
      ciphertext: ct,
      status: "sending",
      createdAt: Date.now(),
    };

    processedMessageIds.current.add(rec.id);
    await addMessage(rec);
    setItems((prev) => [...prev, { record: rec, text, state: "ready" }]);

    setTimeout(async () => {
      await updateMessage(rec.id, { status: "delivered" });
      setItems((prev) => prev.map((i) => (i.record.id === rec.id ? { ...i, record: { ...i.record, status: "delivered" } } : i)));
    }, 600);
    setTimeout(async () => {
      await updateMessage(rec.id, { status: "read" });
      setItems((prev) => prev.map((i) => (i.record.id === rec.id ? { ...i, record: { ...i.record, status: "read" } } : i)));
    }, 1400);
  }

  async function sendImage() {
    if (!cryptoKey || !conversationId || !draftImage) return;
    const buf = await draftImage.file.arrayBuffer();
    const ct = await encryptBytes(cryptoKey, buf);
    const captionText = draftCaption.trim();
    const captionCt = captionText ? await encryptText(cryptoKey, captionText) : undefined;
    const rec: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId,
      sender: "me",
      kind: "image",
      ciphertext: ct,
      caption: captionCt,
      imageMime: draftImage.file.type,
      status: "sending",
      createdAt: Date.now(),
    };

    processedMessageIds.current.add(rec.id);
    await addMessage(rec);
    setItems((prev) => [
      ...prev,
      { record: rec, imageUrl: draftImage.previewUrl, caption: captionText || undefined, state: "ready" },
    ]);
    setDraftImage(null);
    setDraftCaption("");

    setTimeout(async () => {
      await updateMessage(rec.id, { status: "read" });
      setItems((prev) => prev.map((i) => (i.record.id === rec.id ? { ...i, record: { ...i.record, status: "read" } } : i)));
    }, 1200);
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraftImage({ file, previewUrl: url });
    e.target.value = "";
  }

  if (!details) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const contact = details.contact;

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-xl flex-col">
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chats")}
          className="rounded-full"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <AvatarOrb hue={contact.avatarHue} name={contact.name} size="sm" online={contact.online} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display font-semibold leading-tight">{contact.name}</h1>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3 text-primary" aria-hidden />
            E2EE · Key {fp}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hidden">
        <div className="mb-4 flex justify-center">
          <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 text-primary" aria-hidden />
            Messages are end-to-end encrypted with AES-GCM
          </div>
        </div>

        <ul className="space-y-2" role="log" aria-live="polite" aria-label="Conversation">
          {items.map((item) => (
            <Bubble key={item.record.id} view={item} />
          ))}
        </ul>
      </div>

      {draftImage && (
        <div className="glass-strong mx-3 mb-2 animate-scale-in rounded-3xl p-3">
          <div className="flex gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
              <img src={draftImage.previewUrl} alt="Selected attachment preview" className="h-full w-full object-cover" />
              <button
                onClick={() => { setDraftImage(null); setDraftCaption(""); }}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                placeholder="Add a caption…"
                className="bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Caption"
              />
              <Button onClick={sendImage} className="self-end bg-gradient-primary">
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Encrypt & Send
              </Button>
            </div>
          </div>
        </div>
      )}

      <form
        className="glass-strong sticky bottom-0 z-20 flex items-end gap-2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3"
        onSubmit={(e) => { e.preventDefault(); sendText(); }}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label="Attach an encrypted image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <div className="bg-secondary/70 flex flex-1 items-end rounded-3xl px-4 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            rows={1}
            placeholder="Send an encrypted message…"
            className="max-h-32 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Message"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim()}
          className="h-11 w-11 shrink-0 rounded-full bg-gradient-primary disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ view }: { view: DecryptedView }) {
  const { record, text, imageUrl, caption, state } = view;
  const mine = record.sender === "me";
  return (
    <li className={`flex animate-fade-in ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        <div
          className={
            mine
              ? "bg-bubble-sent text-bubble-sent-foreground rounded-3xl rounded-br-md px-4 py-2.5 shadow-bubble"
              : "bg-bubble-received text-bubble-received-foreground rounded-3xl rounded-bl-md px-4 py-2.5 shadow-bubble"
          }
          style={mine ? { backgroundImage: "var(--gradient-primary)" } : undefined}
        >
          {state === "decrypting" && (
            <span className="flex items-center gap-2 text-sm opacity-80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              <span>Decrypting…</span>
            </span>
          )}
          {state === "error" && <span className="text-sm italic opacity-80">Unable to decrypt</span>}
          {state === "ready" && record.kind === "text" && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{text}</p>
          )}
          {state === "ready" && record.kind === "image" && imageUrl && (
            <div className="-mx-2 -mt-1 space-y-2">
              <img src={imageUrl} alt={caption || "Encrypted image"} className="max-h-80 w-full rounded-2xl object-cover" />
              {caption && <p className="px-2 pb-1 text-[14px] leading-snug">{caption}</p>}
            </div>
          )}
        </div>
        <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : "justify-start"}`}>
          <span>{formatTime(record.createdAt)}</span>
          {mine && (
            <span className="flex items-center" aria-label={`Status: ${record.status}`}>
              {record.status === "sending" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              {record.status === "sent" && <Check className="h-3 w-3" aria-hidden />}
              {record.status === "delivered" && <CheckCheck className="h-3 w-3" aria-hidden />}
              {record.status === "read" && <CheckCheck className="h-3 w-3 text-primary" aria-hidden />}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}